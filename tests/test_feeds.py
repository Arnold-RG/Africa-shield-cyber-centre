import json
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from aggregate import (  # noqa: E402
    LABEL,
    assign_source_countries,
    build_arcs,
    build_snapshot,
    timeline_index,
    validate,
)
from geoip import GeoDB  # noqa: E402
from parsers import (  # noqa: E402
    parse_dshield_countries,
    parse_dshield_topips,
    parse_feodo,
    parse_kev,
    parse_spamhaus,
    parse_threatfox,
    parse_urlhaus,
)
from privacy_scan import scan  # noqa: E402

FIXTURES = ROOT / "tests" / "fixtures"


def load(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


PLACES = {
    "US": {"name": "United States of America", "lat": 39.5, "lon": -97.5},
    "DE": {"name": "Germany", "lat": 51.2, "lon": 10.4},
    "AU": {"name": "Australia", "lat": -25.0, "lon": 134.0},
    "CN": {"name": "China", "lat": 35.0, "lon": 103.0},
}


class ParserTests(unittest.TestCase):
    def test_urlhaus_reads_recent_rows_without_inventing_a_country(self):
        updated, events = parse_urlhaus(load("urlhaus.csv"))
        self.assertEqual(updated, "2026-10-17T23:47:09Z")
        self.assertGreaterEqual(len(events), 1)
        self.assertEqual(events[0]["ip"], "115.58.85.77")
        self.assertIsNone(events[0]["country"])
        self.assertIsNone(events[0]["source_country"])
        self.assertIsNone(events[0]["target_country"])
        self.assertEqual(events[0]["role"], "infrastructure")
        self.assertTrue(events[0]["reference"].startswith("https://urlhaus.abuse.ch/"))

    def test_threatfox_extracts_ip_literals_only(self):
        _updated, events = parse_threatfox(load("threatfox.json"))
        by_type = {event["threat_type"]: event for event in events}
        ips = [event["ip"] for event in events if event["ip"]]
        self.assertTrue(ips)
        self.assertTrue(all(event["target_country"] is None for event in events))
        self.assertTrue(any(event["ip"] is None for event in events))
        self.assertIn("botnet_cc", by_type)

    def test_feodo_keeps_published_country_as_infrastructure(self):
        _updated, events = parse_feodo(load("feodo.json"))
        self.assertEqual(events[0]["ip"], "162.243.103.246")
        self.assertEqual(events[0]["country"], "US")
        self.assertIsNone(events[0]["target_country"])
        self.assertEqual(events[0]["role"], "infrastructure")
        self.assertEqual(events[0]["threat_type"], "Emotet")

    def test_spamhaus_reads_networks(self):
        updated, events = parse_spamhaus(load("drop.txt"), feed_label="DROP")
        self.assertIsNotNone(updated)
        self.assertGreaterEqual(len(events), 1)
        self.assertTrue(events[0]["title"].startswith("1.10.16.0/20"))
        self.assertEqual(events[0]["ip"], "1.10.16.0")
        self.assertIsNone(events[0]["observed_at"])
        self.assertIsNone(events[0]["target_country"])

    def test_dshield_targets_are_not_countries(self):
        stats = parse_dshield_countries(load("dshield_countries.json"))
        codes = [row["code"] for row in stats]
        self.assertEqual(codes, ["US", "DE"])
        self.assertGreater(stats[0]["source_addresses"], 0)
        self.assertNotIn("targets", stats[0])
        events = parse_dshield_topips(load("dshield_topips.json"))
        self.assertEqual(events[0]["ip"], "13.94.254.200")
        self.assertEqual(events[0]["role"], "source")
        self.assertIsNone(events[0]["target_country"])
        self.assertGreater(events[0]["target_address_count"], 0)
        self.assertIn("not a country", events[0]["summary"])

    def test_kev_catalog(self):
        updated, rows = parse_kev(load("kev.json"))
        self.assertTrue(updated.startswith("2026-10-16T"))
        self.assertEqual(rows[0]["cve"], "CVE-2026-102764")
        self.assertTrue(rows[0]["reference"].startswith("https://nvd.nist.gov/vuln/detail/"))
        self.assertFalse(rows[0]["simulated"])


class GeoTests(unittest.TestCase):
    def test_range_lookup(self):
        database = GeoDB()
        count = database.load_csv("1.0.0.0,1.0.0.255,AU\n8.8.8.0,8.8.8.255,US\n::,::1,ZZ\n")
        self.assertEqual(count, 2)
        self.assertEqual(database.country("1.0.0.10"), "AU")
        self.assertEqual(database.country("8.8.8.8"), "US")
        self.assertIsNone(database.country("9.9.9.9"))
        self.assertIsNone(database.country("not-an-ip"))


class SnapshotTests(unittest.TestCase):
    def test_timeline_stays_inside_24_hours(self):
        end = datetime(2026, 10, 18, 0, 30, tzinfo=timezone.utc)
        self.assertIsNone(timeline_index(datetime(2026, 10, 17, 0, 30, tzinfo=timezone.utc), end))
        self.assertEqual(timeline_index(datetime(2026, 10, 17, 0, 31, tzinfo=timezone.utc), end), 0)
        self.assertEqual(timeline_index(end, end), 23)

    def test_live_snapshot_does_not_invent_targets_or_arcs(self):
        _updated, urls = parse_urlhaus(load("urlhaus.csv"))
        _updated, feodo = parse_feodo(load("feodo.json"))
        top = parse_dshield_topips(load("dshield_topips.json"))
        database = GeoDB()
        database.load_csv("115.58.85.0,115.58.85.255,CN\n13.94.254.0,13.94.254.255,US\n194.224.249.0,194.224.249.255,DE\n")
        for event in urls + top:
            if event["ip"] and not event["country"]:
                event["country"] = database.country(event["ip"])
        assign_source_countries(top)
        self.assertEqual(top[0]["source_country"], "US")
        self.assertIsNone(top[0]["target_country"])
        self.assertIsNone(urls[0]["source_country"])
        runs = [
            self._run("urlhaus", urls),
            self._run("feodo", feodo),
            self._run("dshield", top, country_stats=parse_dshield_countries(load("dshield_countries.json"))),
            self._run("threatfox", []),
            self._run("spamhaus", []),
            self._run("kev", [], kev=[{"cve": "CVE-2024-0001", "vendor": "Example", "product": "Widget", "name": "Example", "date_added": "2024-01-01", "ransomware": "Unknown", "summary": "Example", "reference": "https://nvd.nist.gov/vuln/detail/CVE-2024-0001", "simulated": False}], kev_count=1),
        ]
        snapshot = build_snapshot(datetime(2026, 10, 18, 1, 0, tzinfo=timezone.utc), runs, PLACES, {"name": "DB-IP Country Lite", "ok": True})
        self.assertEqual(validate(snapshot), [])
        self.assertEqual(snapshot["label"], LABEL)
        self.assertFalse(snapshot["simulated"])
        self.assertEqual(snapshot["top_targets"], [])
        self.assertEqual(snapshot["arcs"], [])
        self.assertIn("not ranked here as a target country", snapshot["top_targets_note"])
        self.assertEqual(snapshot["countries"][0]["code"], "US")
        self.assertGreater(snapshot["timeline"]["buckets"][0] if False else sum(snapshot["timeline"]["buckets"]), 0)
        self.assertTrue(all(event["target_country"] is None for event in snapshot["events"]))

    def test_arcs_require_both_countries(self):
        self.assertEqual(build_arcs([{"source_country": "US", "target_country": None, "feed": "x"}]), [])
        arcs = build_arcs(
            [
                {
                    "source_country": "US",
                    "target_country": "DE",
                    "feed": "example",
                    "reference": "https://example.test/report",
                    "simulated": False,
                }
            ]
        )
        self.assertEqual(len(arcs), 1)
        self.assertEqual(arcs[0]["target_country"], "DE")

    def test_validate_rejects_a_simulated_row_in_a_live_snapshot(self):
        snapshot = build_snapshot(datetime(2026, 10, 18, tzinfo=timezone.utc), [self._run("urlhaus", [])], PLACES, {})
        snapshot["events"] = [
            {
                "feed": "urlhaus",
                "threat_type": "malware_download",
                "title": "Simulated example",
                "observed_at": None,
                "ip": None,
                "country": None,
                "source_country": None,
                "target_country": None,
                "role": "report",
                "reference": None,
                "summary": "Simulated example",
                "simulated": True,
                "target_address_count": None,
            }
        ]
        self.assertTrue(validate(snapshot))

    def _run(self, feed_id, events, country_stats=None, kev=None, kev_count=0):
        return {
            "id": feed_id,
            "name": feed_id,
            "homepage": "https://example.test/",
            "source_urls": ["https://example.test/feed"],
            "licence": "test fixture",
            "licence_url": "https://example.test/licence",
            "role_note": "test fixture",
            "last_updated": None,
            "fetched_at": "2026-10-18T00:00:00Z",
            "ok": True,
            "error": None,
            "parsed_count": len(events) if feed_id != "kev" else kev_count,
            "events": events,
            "country_stats": country_stats or [],
            "kev": kev or [],
            "kev_count": kev_count,
        }


class ShippedCacheTests(unittest.TestCase):
    def test_committed_snapshot_is_a_real_cache(self):
        path = ROOT / "public" / "data" / "snapshot.json"
        doc = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(validate(doc), [])
        self.assertFalse(doc["simulated"])
        self.assertEqual(doc["label"], LABEL)
        self.assertEqual(doc["arcs"], [])
        self.assertGreater(doc["totals"]["countries"], 100)
        self.assertTrue(all(event.get("target_country") is None for event in doc["events"]))
        self.assertTrue(all(event.get("observed_at") is None for event in doc["events"] if event["feed"] == "spamhaus"))
        codes = {country["code"] for country in doc["countries"]}
        self.assertTrue({"US", "HK", "SG", "TW"} <= codes)


class DemoTests(unittest.TestCase):
    def test_demo_file_is_labeled_filler(self):
        doc = json.loads((ROOT / "public" / "data" / "demo.json").read_text(encoding="utf-8"))
        self.assertEqual(validate(doc), [])
        self.assertTrue(doc["simulated"])
        self.assertNotEqual(doc["label"], LABEL)
        self.assertIn("not reported attacks", doc["banner"].lower())
        self.assertTrue(all(event["simulated"] for event in doc["events"]))
        self.assertTrue(all(arc["simulated"] for arc in doc["arcs"]))


class PrivacyTests(unittest.TestCase):
    def test_repository_has_no_forbidden_public_names(self):
        self.assertEqual(scan(ROOT), [])

    def test_countries_use_real_label_points(self):
        payload = json.loads((ROOT / "public" / "vendor" / "countries.json").read_text(encoding="utf-8"))
        codes = [feature["properties"]["iso"] for feature in payload["features"]]
        self.assertEqual(len(codes), len(set(codes)))
        united = next(feature for feature in payload["features"] if feature["properties"]["iso"] == "US")
        self.assertAlmostEqual(united["properties"]["lat"], 39.538, places=2)
        self.assertEqual(united["properties"]["name"], "United States of America")


if __name__ == "__main__":
    unittest.main()
