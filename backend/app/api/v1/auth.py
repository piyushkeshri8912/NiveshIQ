from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid
import hashlib
from datetime import datetime, timedelta
import requests

from app.db.session import get_db
from app.models.user import User
from app.models.user_profile import UserProfile
from app.models.refresh_token import RefreshToken
from app.schemas.auth import (
    UserRegister, 
    UserLogin, 
    TokenResponse, 
    RefreshTokenRequest, 
    GoogleLoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest
)
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.config import settings

router = APIRouter()

def send_resend_email(to_email: str, subject: str, html_body: str) -> bool:
    if not settings.RESEND_API_KEY:
        print("\n[RESEND ERROR] Resend API Key is missing! Please configure RESEND_API_KEY in your .env file.")
        print(f"[DEBUG FALLBACK] Target Email: {to_email}\n[DEBUG FALLBACK] Subject: {subject}\n[DEBUG FALLBACK] Link URL: {html_body}\n")
        return False
        
    headers = {
        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "from": settings.EMAIL_FROM or "onboarding@resend.dev",
        "to": to_email,
        "subject": subject,
        "html": html_body
    }
    try:
        resp = requests.post("https://api.resend.com/emails", json=payload, headers=headers, timeout=10)
        if resp.status_code in (200, 201):
            print(f"\n[RESEND SUCCESS] Successfully sent email to {to_email} via Resend REST API.")
            return True
        else:
            print(f"\n[RESEND FAILURE] API returned status {resp.status_code}")
            print(f"[RESEND RESPONSE] {resp.text}")
            print(f"[HELPFUL TIP] If you are using Resend on a free tier or with an unverified domain:")
            print(f"1. Change EMAIL_FROM in your .env file to: 'onboarding@resend.dev'")
            print(f"2. You can ONLY send emails to your own registered email address (the owner of the Resend key).")
            print(f"3. Verify your custom domain (like niveshiq.com) in Resend settings to send to any email address!\n")
            return False
    except Exception as e:
        print(f"\n[RESEND EXCEPTION] Failed to connect to Resend API: {e}\n")
        return False

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    email = user_in.email.lower().strip()
    
    # Check if user already exists
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered."
        )
        
    # Hash password & generate verification token
    hashed_pwd = get_password_hash(user_in.password)
    verification_token = str(uuid.uuid4())
    
    # Create User in DB (initially unverified)
    user = User(
        email=email,
        hashed_password=hashed_pwd,
        is_active=False,
        is_verified=False,
        verification_token=verification_token
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create default UserProfile
    profile = UserProfile(
        user_id=user.id,
        risk_appetite="MODERATE",
        time_horizon="MEDIUM_TERM",
        investment_goal="BALANCED",
        preferred_sectors=[],
        avoid_sectors=[]
    )
    db.add(profile)
    db.commit()
    
    # Send actual verification email via Resend
    verification_url = f"http://localhost:3000/verify?token={verification_token}"
    html_body = f"""
    <div style="font-family: sans-serif; padding: 24px; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #4f46e5; margin-bottom: 16px; font-weight: 800; font-size: 22px;">Welcome to NiveshIQ!</h2>
        <p style="font-size: 14px; line-height: 1.5; color: #4b5563; margin-bottom: 24px;">
            Thank you for registering. Please click the button below to verify your email address and activate your account:
        </p>
        <div style="margin: 24px 0;">
            <a href="{verification_url}" style="background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                Verify Email Address
            </a>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #4b5563; margin-top: 24px;">
            Or copy and paste this URL into your browser: <br/>
            <span style="color: #4f46e5; word-break: break-all;">{verification_url}</span>
        </p>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 32px; border-top: 1px solid #f3f4f6; padding-top: 16px;">
            If you did not create this account, please ignore this email.
        </p>
    </div>
    """
    
    email_sent = send_resend_email(email, "Verify your NiveshIQ Account", html_body)
    
    # Always print verification URL to console for easy development/testing
    print(f"\n[DEVELOPER ONLY] Verification URL: {verification_url}\n")
    
    return {
        "message": "Registration successful. Please verify your email using the link sent to your inbox.",
        "email_sent": email_sent
    }

@router.get("/verify")
def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.verification_token == token).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token."
        )
        
    user.is_verified = True
    user.is_active = True
    user.verification_token = None
    db.commit()
    
    # Generate tokens for automatic instant login
    access_token = create_access_token(user.id, user.email)
    refresh_token = create_refresh_token(user.id, user.email)
    
    # Store refresh token hash
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    expires_at = datetime.utcnow() + timedelta(days=30)
    
    db_refresh = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at
    )
    db.add(db_refresh)
    db.commit()
    
    return {
        "message": "Email address successfully verified.",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/login", response_model=TokenResponse)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    email = user_in.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    
    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
        
    if not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
        
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email address is not verified. Please verify your email first."
        )
        
    # Generate tokens
    access_token = create_access_token(user.id, user.email)
    refresh_token = create_refresh_token(user.id, user.email)
    
    # Store refresh token hash
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    expires_at = datetime.utcnow() + timedelta(days=30)
    
    db_refresh = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at
    )
    db.add(db_refresh)
    db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=TokenResponse)
def refresh_token_endpoint(req: RefreshTokenRequest, db: Session = Depends(get_db)):
    refresh_token = req.refresh_token
    try:
        payload = decode_token(refresh_token)
        user_id_str = payload.get("sub")
        token_type = payload.get("type")
        if user_id_str is None or token_type != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        user_id = int(user_id_str)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    # Check token hash in DB
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    db_token = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
    if not db_token or db_token.expires_at < datetime.utcnow():
        if db_token:
            db.delete(db_token)
            db.commit()
        raise HTTPException(status_code=401, detail="Expired or invalid refresh token")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User is inactive or not found")
        
    # Generate new access token
    new_access_token = create_access_token(user.id, user.email)
    
    return {
        "access_token": new_access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/google", response_model=TokenResponse)
def google_oauth(req: GoogleLoginRequest, db: Session = Depends(get_db)):
    credential = req.credential
    
    # Verify Google token signature
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        idinfo = id_token.verify_oauth2_token(credential, google_requests.Request(), settings.GOOGLE_CLIENT_ID)
    except Exception as e:
        print(f"Local verification with google-auth library failed: {e}. Falling back to Google public HTTP endpoint...")
        try:
            resp = requests.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={credential}", timeout=5)
            if resp.status_code == 200:
                idinfo = resp.json()
                if idinfo.get("aud") != settings.GOOGLE_CLIENT_ID:
                     raise ValueError("Token audience mismatch.")
            else:
                raise ValueError("Invalid Google token signature from endpoint.")
        except Exception as http_err:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Google identity verification failed: {http_err}"
            )
            
    # Extract user info
    email = idinfo.get("email")
    google_sub = idinfo.get("sub")
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google token payload missing email address."
        )
        
    email = email.lower().strip()
    
    # Find or Create User
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            hashed_password=None,
            google_id=google_sub,
            is_active=True,
            is_verified=True, # Google verified immediately
            verification_token=None
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create default UserProfile
        profile = UserProfile(
            user_id=user.id,
            risk_appetite="MODERATE",
            time_horizon="MEDIUM_TERM",
            investment_goal="BALANCED",
            preferred_sectors=[],
            avoid_sectors=[]
        )
        db.add(profile)
        db.commit()
    else:
        # Associate google_id if existing email registers via Google
        if not user.google_id:
            user.google_id = google_sub
            user.is_verified = True
            user.is_active = True
            db.commit()
        
    # Generate tokens
    access_token = create_access_token(user.id, user.email)
    refresh_token = create_refresh_token(user.id, user.email)
    
    # Store refresh token hash
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    expires_at = datetime.utcnow() + timedelta(days=30)
    
    db_refresh = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at
    )
    db.add(db_refresh)
    db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    email = req.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        return {"message": "If this email exists, a password reset link has been sent to your inbox."}
        
    if not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google sign-in accounts cannot reset password here. Please sign in via Google."
        )
        
    reset_token = str(uuid.uuid4())
    user.reset_token = reset_token
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    db.commit()
    
    reset_url = f"http://localhost:3000/reset-password?token={reset_token}"
    html_body = f"""
    <div style="font-family: sans-serif; padding: 24px; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #4f46e5; margin-bottom: 16px; font-weight: 800; font-size: 22px;">Reset your NiveshIQ Password</h2>
        <p style="font-size: 14px; line-height: 1.5; color: #4b5563; margin-bottom: 24px;">
            You requested to reset your password. Please click the button below to set a new password:
        </p>
        <div style="margin: 24px 0;">
            <a href="{reset_url}" style="background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                Reset Password
            </a>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #4b5563; margin-top: 24px;">
            Or copy and paste this URL into your browser: <br/>
            <span style="color: #4f46e5; word-break: break-all;">{reset_url}</span>
        </p>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 32px; border-top: 1px solid #f3f4f6; padding-top: 16px;">
            This link is valid for 1 hour. If you did not request this, please ignore this email.
        </p>
    </div>
    """
    
    send_resend_email(email, "Reset your NiveshIQ Password", html_body)
    
    # Always print password reset URL to console for easy development/testing
    print(f"\n[DEVELOPER ONLY] Password Reset URL: {reset_url}\n")
    
    return {"message": "If this email exists, a password reset link has been sent to your inbox."}

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.reset_token == req.token,
        User.reset_token_expires > datetime.utcnow()
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token."
        )
        
    user.hashed_password = get_password_hash(req.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    
    return {"message": "Password reset successfully. You can now log in."}
