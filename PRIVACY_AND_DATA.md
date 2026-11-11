# Data provenance, privacy, and research ethics

This document describes how the YunYouQiLu (云游齐鲁 / CCV) repository handles
data. It is a research prototype, not a production tourism service. The paper
and the repository must use the same description; where they disagree, this
document and the code are the source of truth.

## 1. What is real and what is demo

| Layer | Source | Status |
|---|---|---|
| Weather | Open-Meteo API (CC BY 4.0) | Real public data, refreshed by the Node crawler |
| Earthquakes | USGS FDSN Event API | Real public data, refreshed by the Node crawler |
| National ICH list (190 items) | ihchina.cn | Real public list, with descriptions and credits |
| News headlines | Ministry of Culture and Tourism, Xinhua Shandong, Dazhong | Real public headlines |
| 2024 city tourism totals | Shandong Statistical Yearbook 2025, tables 6-20/6-21/6-25/6-26 | Official statistics, exported to `src/data/tourismStats.ts` |
| 2024 city analytics | Same yearbook tables, exported to `data/real/shandong_city_tourism_2024.csv` | Official inputs; reproducible K-means/SOM/SAE outputs in `data/analytics/` |
| Visitor flow, monthly heat, industry, marketing, resource ledger, water level, hazard layers | Generated in the front end from demo fixtures | Synthetic/demo data |
| County-level splits | Allocated from city totals with fixed weights | Demo allocation, not official county data |
| Disaster predictions and capacity warnings | Rule-based demo values | Synthetic/demo data |
| TikTok videos/comments | Collector output in the local MySQL database | Public platform content; not redistributed in the repository |
| Food, heritage, and scenic photos | Wikimedia Commons; some AI-generated placeholders | See the `credit` fields; AI placeholders are marked in the UI |

The front end labels the demo environment on the landing page and in the
global header. The `/flow`, `/industry`, `/resource`, `/marketing`, `/disaster`,
monthly heat, and county-split views are demonstrations of the interface, not
measurements.

## 2. Collection

- The Node crawler checks `robots.txt`, applies request-rate limits, and sends
  a User-Agent that identifies the crawler. These are polite-crawling measures;
  they do not by themselves establish compliance with a platform's terms of
  service or with research-ethics requirements.
- The TikTok collector requires a user-supplied cookie (`TIKTOK_COOKIE`). The
  repository does not include a cookie, a login bypass, or a CAPTCHA bypass.
- The optional `/api/snapshots/` endpoints are read-only and allow-listed to
  weather, earthquake, heritage, and news JSON. They do not expose Django
  models, the TikTok database, or arbitrary files.
- Without a cookie, the TikTok collector writes a small seed set rather than
  attempting to defeat access controls.
- No private messages, phone numbers, or account credentials are collected.
- The repository does not redistribute raw TikTok user profiles or comments.
  The public sample snapshot contains only weather, earthquake, ICH, and news
  data.

## 3. Personal data

The Django models can store the following fields for TikTok users and
commenters: nickname, gender, age, province, bio, follower/following counts,
engagement counts, video metadata, and comment text. These fields can identify
a person indirectly, especially when combined.

Recommended handling for any public release or paper artifact:

1. Do not publish raw nicknames, bios, or comment text with account-level
   identifiers.
2. Replace user identifiers with salted hashes or sequential pseudonyms.
3. Report aggregate counts, topics, and sentiment distributions rather than
   individual records.
4. Remove or generalize province and age when the analysis does not need them.
5. Do not attempt to re-identify users or link accounts across platforms.

The current repository does not ship an anonymization pipeline. If you deploy
the collector, add one before exporting data. A minimal approach is to keep a
local mapping table, export only a salted hash plus aggregate fields, and
delete the mapping after the analysis.

## 4. Retention and deletion

- Raw crawler output is written under `data/raw/`; the exported TikTok file
  `data/real/tiktok_comments_raw.json` is git-ignored as well. Renaming the export
  does not rewrite its payload; source URLs inside the JSON remain as collected.
- Normalized snapshots are written under `data/normalized/` and are git-ignored.
- The public sample snapshot under `data/sample/` contains no TikTok personal
  data.
- Define a retention period before collection (for example, delete raw records
  after the paper is accepted or after 12 months) and document it in the
  project's data-management plan.
- To delete a record, remove it from MySQL and from any exported CSV/JSON. If a
  public artifact already contains the record, withdraw and replace the
  artifact.

## 5. Access control

The Vue login is a front-end demo. It stores accounts in `localStorage` and the
guest button bypasses login. It is not authentication or access control. The
Django views expose account endpoints, but the Vue app does not call them.

For a production or multi-user deployment, put the application behind a
reverse proxy or an identity provider that enforces authentication, use HTTPS,
and restrict the Django admin and MySQL ports. Do not describe the demo login
as access control in the paper or in grant reports.

## 6. Minors and sensitive content

The project does not target minors. If a collected comment or profile appears
to belong to a minor, or contains sensitive personal information, do not quote
it; exclude it from the analysis and delete the raw record. The same rule
applies to content about sensitive locations or events.

## 7. AI-generated images and third-party content

- Some heritage entries without a free photograph use an AI-generated
  placeholder. The UI marks these images. They are illustrative and must not be
  presented as documentary evidence of a site or artifact.
- Wikimedia Commons images retain their author and license in the `credit`
  fields. Check the license before reuse in a publication.
- Open-Meteo data are used under CC BY 4.0. USGS data are public domain. The
  ihchina.cn list is used with attribution; check its terms before
  redistributing a full copy.
- News headlines are quoted for research and commentary. Do not reproduce full
  articles without permission.

## 8. Ethics review

The repository does not include an ethics-review approval or a platform
authorization letter. Before submitting a paper that analyzes TikTok users or
comments, the authors should determine whether their institution requires
ethics review, obtain any required approval or exemption, and keep the
documentation. If the work is defined as software evaluation with no human
subjects, state that explicitly and explain why.

## 9. Reporting problems

If you find personal data, a licensing problem, or a privacy risk in the
repository, open an issue or contact the maintainer at the support address in
the README. Do not post the personal data in the issue itself.
