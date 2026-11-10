import csv
import tempfile
from pathlib import Path

from django.test import SimpleTestCase, TestCase

from app.analytics.forecast import (
    baseline_metrics,
    evaluate_rolling,
    fit_ols,
    fit_series,
    load_series,
    metrics,
    prediction_interval,
)
from app.models import User, Video, VideoComment


class ForecastTests(SimpleTestCase):
    def test_fit_ols_recovers_a_straight_line(self):
        model = fit_ols([(1, 3), (2, 5), (3, 7), (4, 9)])
        self.assertAlmostEqual(model.slope, 2.0)
        self.assertAlmostEqual(model.intercept, 1.0)
        self.assertAlmostEqual(model.predict(5), 11.0)

    def test_fit_series_skips_excluded_years(self):
        series = {2019: 100.0, 2020: 10.0, 2021: 120.0, 2022: 12.0, 2023: 140.0}
        model = fit_series(series, excluded_years=(2020, 2022))
        self.assertAlmostEqual(model.predict(2023), 140.0, places=6)
        self.assertAlmostEqual(model.slope, 10.0, places=6)

    def test_rolling_holdout_compares_with_naive_baseline(self):
        series = {2019: 100.0, 2020: 80.0, 2021: 120.0, 2022: 90.0, 2023: 130.0}
        results = evaluate_rolling(series, [2023], excluded_years=(2020, 2022))
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].year, 2023)
        self.assertEqual(results[0].baseline, 90.0)
        self.assertGreater(metrics(results).mape, 0)
        self.assertGreater(baseline_metrics(results).mape, 0)

    def test_prediction_interval_contains_the_point_forecast(self):
        points = [(2019, 100.0), (2020, 105.0), (2021, 112.0), (2022, 118.0), (2023, 125.0)]
        model = fit_ols(points)
        low, high = prediction_interval(model, points, 2024.0)
        self.assertLess(low, model.predict(2024.0))
        self.assertGreater(high, model.predict(2024.0))

    def test_load_series_skips_blank_and_null_values(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "series.csv"
            with path.open("w", newline="", encoding="utf-8") as handle:
                writer = csv.writer(handle)
                writer.writerow(["year", "value"])
                writer.writerow(["2020", "10.5"])
                writer.writerow(["2021", ""])
                writer.writerow(["2022", "null"])
                writer.writerow(["2023", "12.0"])
            self.assertEqual(load_series(path, value_column="value"), {2020: 10.5, 2023: 12.0})


class AccountModelTests(TestCase):
    def test_password_is_hashed_and_verified(self):
        user = User.create("demo", "secret123")
        user.save()
        self.assertNotEqual(user.password, "secret123")
        self.assertTrue(user.check_password("secret123"))
        self.assertFalse(user.check_password("wrong"))

    def test_password_change_updates_the_hash(self):
        user = User.create("demo", "secret123")
        user.save()
        user.set_password("newsecret")
        user.refresh_from_db()
        self.assertTrue(user.check_password("newsecret"))
        self.assertFalse(user.check_password("secret123"))


class VideoCascadeTests(TestCase):
    def test_deleting_a_video_deletes_its_comments(self):
        video = Video.objects.create(aweme_id="video-1", title="A video")
        VideoComment.objects.create(video=video, content="A comment")
        self.assertEqual(VideoComment.objects.count(), 1)
        video.delete()
        self.assertEqual(VideoComment.objects.count(), 0)
