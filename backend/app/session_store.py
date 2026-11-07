import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models

class PersistentSessionStore:
    def __init__(self):
        self._cache = {}

    def _get_db(self) -> Session:
        return SessionLocal()

    def __setitem__(self, token: str, user_id: str):
        self._cache[token] = str(user_id)
        db = self._get_db()
        try:
            # Look up user to get role & username
            user = db.query(models.User).filter(models.User.id == str(user_id)).first()
            username = user.username if user else "user"
            role = user.role if user else "CASHIER"
            
            # 24 hours expiry
            expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24)
            
            # Upsert session
            db_session = db.query(models.UserSession).filter(models.UserSession.token == token).first()
            if db_session:
                db_session.user_id = str(user_id)
                db_session.expires_at = expires_at
                db_session.username = username
                db_session.role = role
            else:
                db_session = models.UserSession(
                    token=token,
                    user_id=str(user_id),
                    username=username,
                    role=role,
                    expires_at=expires_at
                )
                db.add(db_session)
            db.commit()
        except Exception as e:
            print(f"Warning: Failed to persist session to DB: {e}")
            db.rollback()
        finally:
            db.close()

    def get(self, token: str, default=None):
        if not token:
            return default

        db = self._get_db()
        try:
            now = datetime.datetime.now(datetime.timezone.utc)
            db_session = db.query(models.UserSession).filter(
                models.UserSession.token == token,
                models.UserSession.expires_at > now
            ).first()
            if db_session:
                uid = str(db_session.user_id)
                self._cache[token] = uid
                return uid
            else:
                self._cache.pop(token, None)
                return default
        except Exception as e:
            print(f"Warning: Failed to query session from DB: {e}")
            return self._cache.get(token, default)
        finally:
            db.close()

    def __getitem__(self, token: str):
        val = self.get(token)
        if val is None:
            raise KeyError(token)
        return val

    def __contains__(self, token: str):
        return self.get(token) is not None

    def __delitem__(self, token: str):
        self._cache.pop(token, None)
        db = self._get_db()
        try:
            db.query(models.UserSession).filter(models.UserSession.token == token).delete()
            db.commit()
        except Exception as e:
            print(f"Warning: Failed to delete session from DB: {e}")
            db.rollback()
        finally:
            db.close()

    def values(self):
        db = self._get_db()
        try:
            now = datetime.datetime.now(datetime.timezone.utc)
            db_sessions = db.query(models.UserSession.user_id).filter(
                models.UserSession.expires_at > now
            ).all()
            return [str(s[0]) for s in db_sessions]
        except Exception as e:
            print(f"Warning: Failed to get active session values from DB: {e}")
            return list(set(str(v) for v in self._cache.values()))
        finally:
            db.close()

    def keys(self):
        db = self._get_db()
        try:
            now = datetime.datetime.now(datetime.timezone.utc)
            db_sessions = db.query(models.UserSession.token).filter(
                models.UserSession.expires_at > now
            ).all()
            return [str(s[0]) for s in db_sessions]
        except Exception as e:
            print(f"Warning: Failed to get session keys from DB: {e}")
            return list(self._cache.keys())
        finally:
            db.close()

    def clear(self):
        self._cache.clear()
        db = self._get_db()
        try:
            db.query(models.UserSession).delete()
            db.commit()
        except Exception as e:
            print(f"Warning: Failed to clear sessions: {e}")
            db.rollback()
        finally:
            db.close()

sessions = PersistentSessionStore()
