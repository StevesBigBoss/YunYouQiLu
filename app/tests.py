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
from app.analytics.autoencoder import train_sparse_autoencoder
from app.analytics.clustering import run_kmeans, select_k
from app.analytics.features import FEATURE_NAMES, load_city_dataset
from app.analytics.som import train_som
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


class CityFeatureTests(SimpleTestCase):
    def test_load_city_dataset_adds_derived_features(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "cities.csv"
            with path.open("w", newline="", encoding="utf-8") as handle:
                writer = csv.writer(handle)
                writer.writerow([
                    "city", "visitors_10k", "revenue_100m_cny", "visitors_yoy_pct",
                    "revenue_yoy_pct", "inbound_visitors_10k",
                    "inbound_foreign_visitors_10k", "inbound_fx_10k_usd",
                ])
                writer.writerow(["A", "100", "80", "10", "12", "5", "4", "300"])
                writer.writerow(["B", "200", "240", "8", "9", "10", "8", "600"])
            dataset = load_city_dataset(path)
        self.assertEqual(dataset.row_count, 2)
        self.assertEqual(dataset.column_count, len(FEATURE_NAMES))
        self.assertEqual(dataset.feature_names, FEATURE_NAMES)
        self.assertAlmostEqual(dataset.raw[0][7], 8000.0)
        self.assertAlmostEqual(dataset.raw[0][8], 5.0)
        self.assertEqual(len(dataset.standardized[0]), len(FEATURE_NAMES))


class KMeansTests(SimpleTestCase):
    def test_separated_groups_are_assigned_to_different_clusters(self):
        points = [(0.0, 0.0), (0.0, 1.0), (10.0, 10.0), (10.0, 11.0)]
        result = run_kmeans(points, 2, seed=7)
        self.assertEqual(result.labels[0], result.labels[1])
        self.assertEqual(result.labels[2], result.labels[3])
        self.assertNotEqual(result.labels[0], result.labels[2])
        self.assertGreater(result.silhouette, 0.8)
        self.assertGreater(result.inertia, 0.0)

    def test_same_seed_produces_the_same_assignment(self):
        points = [(0.0, 0.0), (0.0, 1.0), (10.0, 10.0), (10.0, 11.0)]
        first = run_kmeans(points, 2, seed=11)
        second = run_kmeans(points, 2, seed=11)
        self.assertEqual(first.labels, second.labels)
        self.assertEqual(first.centroids, second.centroids)

    def test_select_k_returns_the_best_silhouette(self):
        points = [(0.0, 0.0), (0.0, 1.0), (10.0, 10.0), (10.0, 11.0)]
        best, candidates = select_k(points, seed=7)
        self.assertEqual(best.silhouette, max(item.silhouette for item in candidates))
        self.assertGreaterEqual(best.k, 2)


class SOMTests(SimpleTestCase):
    def test_som_returns_valid_metrics_and_node_coordinates(self):
        points = [(0.0, 0.0), (0.0, 1.0), (10.0, 10.0), (10.0, 11.0)]
        result = train_som(points, rows=2, columns=2, epochs=50, seed=7)
        self.assertEqual(len(result.assignments), len(points))
        self.assertGreaterEqual(result.quantization_error, 0.0)
        self.assertGreaterEqual(result.topographic_error, 0.0)
        self.assertLessEqual(result.topographic_error, 1.0)
        self.assertEqual(len(result.hit_counts), 4)
        for node in result.assignments:
            row, column = divmod(node, 2)
            self.assertLess(row, 2)
            self.assertLess(column, 2)

    def test_som_is_deterministic_for_a_fixed_seed(self):
        points = [(0.0, 0.0), (0.0, 1.0), (10.0, 10.0), (10.0, 11.0)]
        first = train_som(points, rows=2, columns=2, epochs=50, seed=7)
        second = train_som(points, rows=2, columns=2, epochs=50, seed=7)
        self.assertEqual(first.assignments, second.assignments)
        self.assertEqual(first.weights, second.weights)


class SparseAutoencoderTests(SimpleTestCase):
    def test_sparse_autoencoder_reduces_reconstruction_error(self):
        points = [
            (0.1, 0.2, 0.3),
            (0.2, 0.1, 0.4),
            (0.9, 0.8, 0.7),
            (0.8, 0.9, 0.6),
        ]
        result = train_sparse_autoencoder(points, hidden_dim=2, epochs=300, seed=7)
        self.assertEqual(len(result.codes), len(points))
        self.assertTrue(all(0.0 < value < 1.0 for code in result.codes for value in code))
        self.assertLess(result.reconstruction_mse, result.baseline_mse)
        self.assertGreater(result.mean_hidden_activation, 0.0)
        self.assertGreaterEqual(result.active_fraction, 0.0)
        self.assertLessEqual(result.active_fraction, 1.0)

    def test_sparse_autoencoder_is_deterministic(self):
        points = [(0.1, 0.2, 0.3), (0.2, 0.1, 0.4), (0.9, 0.8, 0.7), (0.8, 0.9, 0.6)]
        first = train_sparse_autoencoder(points, hidden_dim=2, epochs=100, seed=7)
        second = train_sparse_autoencoder(points, hidden_dim=2, epochs=100, seed=7)
        self.assertEqual(first.codes, second.codes)
        self.assertAlmostEqual(first.final_loss, second.final_loss)


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
