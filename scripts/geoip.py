"""Offline country lookup for DB-IP Country Lite CSV data.

The database is downloaded by the fetch job. It is not required at browser
runtime. Attribution belongs with the snapshot: IP geolocation by DB-IP,
licensed CC BY 4.0.
"""

from __future__ import annotations

import ipaddress
from bisect import bisect_right


class GeoDB:
    def __init__(self) -> None:
        self.v4: list[tuple[int, int, str]] = []
        self.v6: list[tuple[int, int, str]] = []

    def load_csv(self, text: str) -> int:
        v4: list[tuple[int, int, str]] = []
        v6: list[tuple[int, int, str]] = []
        for line in text.splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = [part.strip() for part in line.split(",")]
            if len(parts) < 3:
                continue
            start, end, code = parts[0], parts[1], parts[2].upper()
            if len(code) != 2 or not code.isalpha() or code == "ZZ":
                continue
            try:
                start_ip = ipaddress.ip_address(start)
                end_ip = ipaddress.ip_address(end)
            except ValueError:
                continue
            if start_ip.version != end_ip.version:
                continue
            row = (int(start_ip), int(end_ip), code)
            if start_ip.version == 4:
                v4.append(row)
            else:
                v6.append(row)
        v4.sort()
        v6.sort()
        self.v4 = v4
        self.v6 = v6
        return len(v4) + len(v6)

    def country(self, ip: str | None) -> str | None:
        if not ip:
            return None
        try:
            parsed = ipaddress.ip_address(ip.strip())
        except ValueError:
            return None
        ranges = self.v4 if parsed.version == 4 else self.v6
        if not ranges:
            return None
        number = int(parsed)
        starts = [row[0] for row in ranges]
        index = bisect_right(starts, number) - 1
        if index < 0:
            return None
        start, end, code = ranges[index]
        if start <= number <= end:
            return code
        return None
