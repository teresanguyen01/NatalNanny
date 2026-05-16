from datetime import date, datetime
from typing import Any

from pydantic import BaseModel


class BrowniePointEntry(BaseModel):
    date: date
    points: float


class LastCheckin(BaseModel):
    date: date
    stats: dict[str, Any] | None


class DashboardSummary(BaseModel):
    """Single-round-trip payload for the dashboard initial load."""

    brownie_points: list[BrowniePointEntry]
    streak: int
    mascot_health: int
    last_checkin: LastCheckin | None
    checkin_dates: list[date]


class BrowniePointsResponse(BaseModel):
    days: int
    entries: list[BrowniePointEntry]


class StreakResponse(BaseModel):
    streak: int


class MascotResponse(BaseModel):
    mascot_health: int


class CheckinDatesResponse(BaseModel):
    month: str
    dates: list[date]
