"""Shared test helper for the OTP-gated registration flow.

Registration now requires emailing a 4-digit code before a user is created
(see app.services.auth_service). Tests use FakeMailer in place of the real
SMTP/console mailer so they can read the code back out without touching a
real inbox.
"""
import re


class FakeMailer:
    def __init__(self) -> None:
        self.sent: dict[str, str] = {}

    def send(self, to: str, subject: str, body: str) -> None:
        match = re.search(r"\b(\d{4})\b", body)
        assert match, f"no 4-digit code found in email body: {body!r}"
        self.sent[to] = match.group(1)


def register_via_otp(
    client,
    mailer: FakeMailer,
    email: str,
    role: str = "admin",
    full_name: str = "Test",
    password: str = "password123",
) -> dict:
    payload = {"email": email, "full_name": full_name, "password": password, "role": role}

    r = client.post("/api/v1/auth/register/request-otp", json=payload)
    assert r.status_code == 200, r.text

    code = mailer.sent[email]
    r2 = client.post(
        "/api/v1/auth/register/verify-otp",
        json={**payload, "otp_code": code},
    )
    assert r2.status_code == 201, r2.text
    return r2.json()
