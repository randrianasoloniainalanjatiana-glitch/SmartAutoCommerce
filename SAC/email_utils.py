import smtplib
import random
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(os.path.join(BASE_DIR, '.env'))

EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")


def generate_code():
    """Génère un code de confirmation à 6 chiffres."""
    return str(random.randint(100000, 999999))


def send_confirmation_email(to_email, code, code_type='inscription'):
    """Envoie un email avec le code de confirmation via Gmail SMTP."""

    if code_type == 'inscription':
        subject = "SmartAutoCommerce — Code de confirmation d'inscription"
        title = "Confirmez votre inscription"
        message_text = "Merci de vous être inscrit sur SmartAutoCommerce. Utilisez le code ci-dessous pour confirmer votre adresse email."
    else:
        subject = "SmartAutoCommerce — Code de réinitialisation du mot de passe"
        title = "Réinitialisation du mot de passe"
        message_text = "Vous avez demandé la réinitialisation de votre mot de passe. Utilisez le code ci-dessous pour créer un nouveau mot de passe."

    html_body = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #06b6d4, #3b82f6); padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">{title}</h1>
        </div>
        <div style="padding: 32px 24px; text-align: center;">
            <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                {message_text}
            </p>
            <div style="background: #f0f9ff; border: 2px dashed #06b6d4; border-radius: 12px; padding: 20px; margin: 0 0 24px 0;">
                <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0e7490;">{code}</span>
            </div>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Ce code expire dans <strong>10 minutes</strong>. Ne partagez ce code avec personne.
            </p>
        </div>
        <div style="background: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 11px; margin: 0;">
                Si vous n'avez pas fait cette demande, ignorez cet email.
            </p>
        </div>
    </div>
    """

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = f"SmartAutoCommerce <{EMAIL_HOST_USER}>"
    msg['To'] = to_email
    msg.attach(MIMEText(html_body, 'html'))

    try:
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(EMAIL_HOST_USER, EMAIL_HOST_PASSWORD)
            server.sendmail(EMAIL_HOST_USER, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"Erreur envoi email: {e}")
        return False
