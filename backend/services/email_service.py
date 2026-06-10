# -*- coding: utf-8 -*-
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
MAIL_FROM = os.getenv("MAIL_FROM", "onboarding@resend.dev")
MAIL_FROM_NAME = "Ветеринарная клиника"


async def send_email(to: str, subject: str, body: str):
    """Отправка письма через Resend API (работает на Render)"""
    if not RESEND_API_KEY:
        print(f"[Email disabled] To: {to} | Subject: {subject}")
        return

    payload = {
        "from": f"{MAIL_FROM_NAME} <{MAIL_FROM}>",
        "to": [to],
        "subject": subject,
        "html": body,
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                json=payload,
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                timeout=10,
            )
        if resp.status_code in (200, 201):
            print(f"[Email sent] To: {to} | Subject: {subject}")
        else:
            print(f"[Email error] Status {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"[Email error] {e}")


# --- Шаблоны писем ---
# ── Базовый HTML-шаблон ───────────────────────────────────────────────────────
def base_template(header_color: str, header_text: str, body_html: str) -> str:
    return f"""
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f8f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f8f4;padding:24px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <tr><td style="background:{header_color};padding:24px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-bottom:4px;">Администрация города Байконур</div>
              <div style="font-size:16px;font-weight:700;color:#ffffff;line-height:1.3;">ГБУ «Городская ветеринарная станция»</div>
              <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px;">ул. Носова, д. 14 · +7 (33622) 4-62-68</div>
            </td>
            <td align="right" style="font-size:32px;">🐾</td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="padding:24px 32px 0;">
        <div style="font-size:18px;font-weight:700;color:#1a202c;">{header_text}</div>
        <div style="height:1px;background:#e2e8f0;margin-top:16px;"></div>
      </td></tr>
      <tr><td style="padding:20px 32px 28px;">{body_html}</td></tr>
      <tr><td style="background:#f1f8f1;padding:14px 32px;border-top:1px solid #e2e8f0;">
        <div style="font-size:11px;color:#94a3b8;text-align:center;">
          Это автоматическое уведомление от АИС ГБУ «Горветстанция г. Байконур» · Не отвечайте на это письмо
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
"""


def info_block(rows: list) -> str:
    items = "".join(
        f'<tr><td style="padding:8px 14px;font-size:13px;color:#64748b;width:40%;border-bottom:1px solid #f1f5f9;">{k}</td>'
        f'<td style="padding:8px 14px;font-size:13px;color:#1a202c;font-weight:600;border-bottom:1px solid #f1f5f9;">{v}</td></tr>'
        for k, v in rows
    )
    return f'<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;margin:16px 0;">{items}</table>'


async def send_appointment_created(client_email, client_name, pet_name, date, time, vet_name):
    subject = "Запись на приём подтверждена — ГВС Байконур"
    body = base_template("#166534", "Запись на приём подтверждена", f"""
<p style="font-size:14px;color:#374151;margin:0 0 16px;">Здравствуйте, <strong>{client_name}</strong>! Ваша запись на приём успешно оформлена.</p>
{info_block([("Питомец", pet_name), ("Дата", date), ("Время", time), ("Врач", vet_name), ("Статус", "✓ Записан")])}
""")
    await send_email(client_email, subject, body)


async def send_appointment_confirmed(client_email, client_name, pet_name, date, time, vet_name, vet_message=""):
    await send_appointment_created(client_email, client_name, pet_name, date, time, vet_name)


async def send_appointment_cancelled(client_email, client_name, pet_name, date, time, vet_message=""):
    subject = "Запись отменена — ГВС Байконур"
    body = base_template("#991b1b", "Запись на приём отменена", f"""
<p style="font-size:14px;color:#374151;margin:0 0 16px;">Здравствуйте, <strong>{client_name}</strong>! Ваша запись была отменена.</p>
{info_block([("Питомец", pet_name), ("Дата", date), ("Время", time)])}
{f'<div style="background:#fff1f2;border:1px solid #fca5a5;border-radius:6px;padding:12px 16px;margin-top:12px;font-size:13px;color:#374151;">{vet_message}</div>' if vet_message else ""}
""")
    await send_email(client_email, subject, body)


async def send_vaccination_reminder(client_email, client_name, pet_name, vaccine_name, due_date, days_left):
    overdue = days_left < 0
    subject = f"{'⚠ Просрочена прививка' if overdue else 'Плановая вакцинация'} — {pet_name} · ГВС Байконур"
    body = base_template(
        "#991b1b" if overdue else "#1e40af",
        "Просроченная вакцинация" if overdue else "Напоминание о вакцинации",
        f"""
<p style="font-size:14px;color:#374151;margin:0 0 16px;">Здравствуйте, <strong>{client_name}</strong>!</p>
{info_block([("Питомец", pet_name), ("Вакцина", vaccine_name), ("Дата", due_date), ("Дней", str(abs(days_left)))])}
"""
    )
    await send_email(client_email, subject, body)


async def send_new_message_notification(recipient_email, recipient_name, sender_name, message_preview, appointment_date):
    subject = f"Новое сообщение от {sender_name} — ГВС Байконур"
    preview = message_preview[:120] + ('...' if len(message_preview) > 120 else '')
    body = base_template("#166534", "Новое сообщение", f"""
<p style="font-size:14px;color:#374151;margin:0 0 16px;">Здравствуйте, <strong>{recipient_name}</strong>! Вам написал <strong>{sender_name}</strong>.</p>
{info_block([("По приёму", appointment_date), ("Сообщение", preview)])}
""")
    await send_email(recipient_email, subject, body)


async def send_lab_results_ready(client_email, client_name, pet_name, order_number, services, results_summary=""):
    subject = f"Анализы {pet_name} готовы · ГВС Байконур"
    services_html = "".join(f'<li style="padding:4px 0;">{s}</li>' for s in services)
    body = base_template("#166534", "Результаты анализов готовы", f"""
<p style="font-size:14px;color:#374151;margin:0 0 16px;">Здравствуйте, <strong>{client_name}</strong>! Анализы питомца <strong>{pet_name}</strong> (заявка {order_number}) готовы.</p>
<ul style="margin:0;padding-left:20px;font-size:13px;">{services_html}</ul>
""")
    await send_email(client_email, subject, body)


async def send_lab_results_to_vet(vet_email, vet_name, pet_name, owner_name, order_number, services, results=None):
    subject = f"🔬 Анализы готовы: {pet_name} ({owner_name})"
    services_html = "".join(f'<li style="padding:4px 0;">{s}</li>' for s in services)
    body = base_template("#1e293b", "Результаты анализов готовы", f"""
<p style="font-size:14px;color:#374151;margin:0 0 16px;">Уважаемый(ая) <strong>{vet_name}</strong>! Готовы анализы: <strong>{pet_name}</strong> (владелец: {owner_name}), заявка {order_number}.</p>
<ul style="margin:0;padding-left:20px;font-size:13px;">{services_html}</ul>
""")
    await send_email(vet_email, subject, body)
