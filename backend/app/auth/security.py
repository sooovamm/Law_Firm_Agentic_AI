"""Password hashing helpers backed by bcrypt.

We use the `bcrypt` library directly rather than passlib. Modern bcrypt (4.x)
rejects passwords longer than 72 bytes, so we defensively truncate to the
bcrypt limit before hashing/verifying, which matches bcrypt's historical
behavior and keeps long passphrases working.
"""
import bcrypt

_BCRYPT_MAX_BYTES = 72


def _normalize(password: str) -> bytes:
    return password.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def hash_password(plain_password: str) -> str:
    hashed = bcrypt.hashpw(_normalize(plain_password), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(_normalize(plain_password), hashed_password.encode("utf-8"))
    except (ValueError, TypeError):
        return False
