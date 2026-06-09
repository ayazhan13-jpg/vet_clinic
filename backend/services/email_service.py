# -*- coding: utf-8 -*-
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from dotenv import load_dotenv
import os
from pathlib import Path

# Ищем .env или _env в корне проекта
_base = Path(__file__).resolve().parent.parent
for _name in ['.env', '_env', '../.env', '../_env']:
    _p = _base / _name
    if _p.exists():
        load_dotenv(_p)
        break
else:
    load_dotenv()  # попытка найти автоматически

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", ""),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", ""),
    MAIL_FROM=os.getenv("MAIL_FROM", "noreply@vetclinic.ru"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_FROM_NAME="ГБУ «Горветстанция г. Байконур»",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
)

fm = FastMail(conf)

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

      <!-- Шапка -->
      <tr><td style="background:{header_color};padding:24px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-bottom:4px;">
                Администрация города Байконур
              </div>
              <div style="font-size:16px;font-weight:700;color:#ffffff;line-height:1.3;">
                ГБУ «Городская ветеринарная станция»
              </div>
              <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px;">
                ул. Носова, д. 14 · +7 (33622) 4-62-68 · gvsbaykonur2005@yandex.ru
              </div>
            </td>
            <td align="right" style="font-size:32px;">🐾</td>
          </tr>
        </table>
      </td></tr>

      <!-- Заголовок письма -->
      <tr><td style="padding:24px 32px 0;">
        <div style="font-size:18px;font-weight:700;color:#1a202c;">{header_text}</div>
        <div style="height:1px;background:#e2e8f0;margin-top:16px;"></div>
      </td></tr>

      <!-- Тело -->
      <tr><td style="padding:20px 32px 28px;">
        {body_html}
      </td></tr>

      <!-- Подвал -->
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
    """Блок с данными (ключ: значение)"""
    items = "".join(
        f'<tr><td style="padding:8px 14px;font-size:13px;color:#64748b;width:40%;border-bottom:1px solid #f1f5f9;">{k}</td>'
        f'<td style="padding:8px 14px;font-size:13px;color:#1a202c;font-weight:600;border-bottom:1px solid #f1f5f9;">{v}</td></tr>'
        for k, v in rows
    )
    return f"""
<table width="100%" cellpadding="0" cellspacing="0"
  style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;margin:16px 0;">
  {items}
</table>
"""

# ── Отправка ──────────────────────────────────────────────────────────────────
async def send_email(to: str, subject: str, body: str):
    if not os.getenv("MAIL_USERNAME"):
        print(f"[Email disabled] To: {to} | Subject: {subject}")
        return
    try:
        message = MessageSchema(
            subject=subject, recipients=[to],
            body=body, subtype=MessageType.html
        )
        await fm.send_message(message)
        print(f"[Email sent] To: {to} | Subject: {subject}")
    except Exception as e:
        print(f"[Email error] {e}")


# ── Шаблон: Запись создана (сразу подтверждена) ───────────────────────────────
async def send_appointment_created(client_email: str, client_name: str,
                                    pet_name: str, date: str, time: str,
                                    vet_name: str):
    subject = "Запись на приём подтверждена — ГВС Байконур"
    body = base_template(
        header_color="#166534",
        header_text="Запись на приём подтверждена",
        body_html=f"""
<p style="font-size:14px;color:#374151;margin:0 0 4px;">Здравствуйте, <strong>{client_name}</strong>!</p>
<p style="font-size:14px;color:#374151;margin:0 0 16px;">
  Ваша запись на приём успешно оформлена. Ждём вас в назначенное время.
</p>

{info_block([
    ("Питомец", pet_name),
    ("Дата", date),
    ("Время", time),
    ("Ветеринарный врач", vet_name),
    ("Статус", "✓ Записан"),
])}

<div style="background:#dcfce7;border:1px solid #86efac;border-radius:6px;padding:12px 16px;margin-top:16px;">
  <div style="font-size:13px;color:#166534;font-weight:600;">
    ✓ Запись подтверждена автоматически
  </div>
  <div style="font-size:12px;color:#4ade80;margin-top:4px;">
    Пожалуйста, приходите за 5 минут до приёма. Не забудьте взять ветеринарный паспорт животного.
  </div>
</div>

<p style="font-size:12px;color:#94a3b8;margin-top:20px;">
  Если вам нужно отменить запись — сделайте это в личном кабинете.
</p>
"""
    )
    await send_email(client_email, subject, body)


# ── Шаблон: Запись отменена ───────────────────────────────────────────────────
async def send_appointment_cancelled(client_email: str, client_name: str,
                                      pet_name: str, date: str, time: str,
                                      vet_message: str = ""):
    subject = "Запись отменена — ГВС Байконур"
    reason_block = f"""
<div style="background:#fff1f2;border:1px solid #fca5a5;border-radius:6px;padding:12px 16px;margin-top:12px;">
  <div style="font-size:12px;color:#991b1b;font-weight:600;margin-bottom:4px;">Причина отмены:</div>
  <div style="font-size:13px;color:#374151;">{vet_message}</div>
</div>
""" if vet_message else ""

    body = base_template(
        header_color="#991b1b",
        header_text="Запись на приём отменена",
        body_html=f"""
<p style="font-size:14px;color:#374151;margin:0 0 4px;">Здравствуйте, <strong>{client_name}</strong>!</p>
<p style="font-size:14px;color:#374151;margin:0 0 16px;">
  К сожалению, ваша запись на приём была отменена.
</p>

{info_block([
    ("Питомец", pet_name),
    ("Дата", date),
    ("Время", time),
])}

{reason_block}

<p style="font-size:13px;color:#374151;margin-top:16px;">
  Вы можете записаться на другое удобное время в личном кабинете системы.
</p>
"""
    )
    await send_email(client_email, subject, body)


# ── Шаблон: Приём завершён (с рецептом) ──────────────────────────────────────
async def send_appointment_completed(client_email: str, client_name: str,
                                      pet_name: str, date: str, vet_name: str,
                                      anamnesis: str = "", diagnosis: str = "",
                                      medications: str = "",
                                      recommendations: str = "", notes: str = ""):
    subject = f"Приём завершён — {pet_name} · ГВС Байконур"

    def fmt_block(title, content, color):
        if not content or not content.strip():
            return ""
        lines = content.strip().replace('\n', '<br>')
        return f"""
<div style="margin:12px 0;">
  <div style="font-size:11px;font-weight:700;color:{color};text-transform:uppercase;
              letter-spacing:0.5px;margin-bottom:6px;">{title}</div>
  <div style="background:#fff;border:1px solid #e2e8f0;border-left:3px solid {color};
              border-radius:0 6px 6px 0;padding:10px 14px;font-size:13px;
              color:#1a202c;line-height:1.7;">{lines}</div>
</div>"""

    has_prescription = any([anamnesis, diagnosis, medications, recommendations, notes])

    prescription_section = f"""
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;
            padding:16px 20px;margin-top:16px;">
  <div style="font-size:14px;font-weight:700;color:#1e293b;margin-bottom:12px;
              padding-bottom:10px;border-bottom:1px solid #e2e8f0;">
    📋 Заключение врача
  </div>
  {fmt_block("Анамнез и жалобы", anamnesis, "#475569")}
  {fmt_block("Диагноз / заключение", diagnosis, "#166534")}
  {fmt_block("Назначенные препараты", medications, "#1e40af")}
  {fmt_block("Рекомендации по уходу", recommendations, "#92400e")}
  {fmt_block("Дополнительные заметки", notes, "#64748b")}
</div>
""" if has_prescription else """
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;
            padding:14px 16px;margin-top:16px;font-size:13px;color:#94a3b8;">
  Рекомендации по итогам приёма уточните у вашего ветеринара.
</div>
"""

    body = base_template(
        header_color="#1e40af",
        header_text="Приём завершён",
        body_html=f"""
<p style="font-size:14px;color:#374151;margin:0 0 16px;">
  Здравствуйте, <strong>{client_name}</strong>!
  Приём вашего питомца <strong>{pet_name}</strong> успешно завершён.
</p>

{info_block([
    ("Питомец", pet_name),
    ("Дата приёма", date),
    ("Ветеринарный врач", vet_name),
])}

{prescription_section}

<p style="font-size:12px;color:#94a3b8;margin-top:20px;">
  Полная история приёмов доступна в личном кабинете в разделе «Паспорт питомца».
</p>
"""
    )
    await send_email(client_email, subject, body)


# ── Шаблон: Напоминание о прививке ───────────────────────────────────────────
async def send_vaccination_reminder(client_email: str, client_name: str,
                                     pet_name: str, vaccine_name: str,
                                     due_date: str, days_left: int):
    overdue = days_left < 0
    days_abs = abs(days_left)

    if overdue:
        subject = f"⚠ Просрочена прививка — {pet_name} · ГВС Байконур"
        urgency_text = f"<strong style='color:#b45309;'>Просрочено на {days_abs} дней!</strong> Необходимо срочно посетить ветеринара."
        header_color = "#991b1b"
        header_text = "Просроченная вакцинация"
        due_label = ("Срок прошёл", due_date)
        days_label = ("Просрочено на", f"{days_abs} дн.")
    else:
        urgent = days_left <= 7
        subject = f"{'⚠ Срочно: п' if urgent else 'П'}лановая вакцинация — {pet_name} · ГВС Байконур"
        if urgent:
            urgency_text = f"<strong style='color:#b45309;'>Срочно:</strong> срок вакцинации наступает через {days_left} дн."
        else:
            urgency_text = f"Через {days_left} дн. вашему питомцу необходима плановая прививка."
        header_color = "#b45309" if urgent else "#1e40af"
        header_text = "Напоминание о плановой вакцинации"
        due_label = ("Плановая дата", due_date)
        days_label = ("Осталось дней", str(days_left))

    body = base_template(
        header_color=header_color,
        header_text=header_text,
        body_html=f"""
<p style="font-size:14px;color:#374151;margin:0 0 16px;">
  Здравствуйте, <strong>{client_name}</strong>!
  {urgency_text}
</p>

{info_block([
    ("Питомец", pet_name),
    ("Вакцина", vaccine_name),
    due_label,
    days_label,
])}

<p style="font-size:13px;color:#374151;margin-top:16px;">
  Запишитесь на приём в личном кабинете или по телефону: +7 (33622) 4-62-68.
</p>
"""
    )
    await send_email(client_email, subject, body)


# ── Шаблон: Новое сообщение в чате ───────────────────────────────────────────
async def send_new_message_notification(recipient_email: str, recipient_name: str,
                                         sender_name: str, message_preview: str,
                                         appointment_date: str):
    subject = f"Новое сообщение от {sender_name} — ГВС Байконур"
    preview = message_preview[:120] + ('...' if len(message_preview) > 120 else '')
    body = base_template(
        header_color="#166534",
        header_text="Новое сообщение",
        body_html=f"""
<p style="font-size:14px;color:#374151;margin:0 0 16px;">
  Здравствуйте, <strong>{recipient_name}</strong>!
  Вам пришло новое сообщение от <strong>{sender_name}</strong>.
</p>

{info_block([
    ("По приёму", appointment_date),
    ("Сообщение", preview),
])}

<p style="font-size:13px;color:#374151;margin-top:16px;">
  Войдите в личный кабинет чтобы ответить.
</p>
"""
    )
    await send_email(recipient_email, subject, body)


# ── Совместимость: старая функция ─────────────────────────────────────────────
async def send_appointment_confirmed(client_email: str, client_name: str,
                                      pet_name: str, date: str, time: str,
                                      vet_name: str, vet_message: str = ""):
    """Алиас — теперь запись подтверждается автоматически при создании"""
    await send_appointment_created(client_email, client_name, pet_name, date, time, vet_name)


# ── Шаблон: Анализы готовы (клиенту) ─────────────────────────────────────────
async def send_lab_results_ready(
    client_email: str, client_name: str,
    pet_name: str, order_number: str,
    services: list, results_summary: str = ""
):
    subject = f"Анализы {pet_name} готовы · ГВС Байконур"
    services_html = "".join(
        f'<li style="padding:4px 0;color:#1e293b;">{s}</li>' for s in services
    )
    body = f"""
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#2e7d32,#1b5e20);padding:28px 32px;">
        <div style="font-size:28px;margin-bottom:8px;">🔬</div>
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">Результаты анализов готовы</h1>
        <p style="margin:6px 0 0;color:#a5d6a7;font-size:14px;">ГБУ «Городская ветеринарная станция г. Байконур»</p>
      </div>
      <div style="padding:28px 32px;">
        <p style="font-size:15px;color:#1e293b;">Уважаемый(ая) <strong>{client_name}</strong>,</p>
        <p style="font-size:15px;color:#475569;">Результаты анализов вашего питомца <strong>{pet_name}</strong> (заявка <strong>{order_number}</strong>) готовы и переданы лечащему врачу.</p>
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px 20px;margin:20px 0;">
          <div style="font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Проведённые исследования</div>
          <ul style="margin:0;padding-left:20px;font-size:13px;">{services_html}</ul>
        </div>
        <p style="font-size:13px;color:#64748b;margin-top:20px;">Результаты вшиты в электронную медицинскую карту питомца. Для консультации обратитесь к вашему ветеринарному врачу.</p>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">
          ГБУ «Городская ветеринарная станция г. Байконур» · ул. Носова, 14 · +7 (33622) 4-62-68
        </div>
      </div>
    </div>
    """
    await send_email(client_email, subject, body)


# ── Шаблон: Уведомление ВРАЧУ о готовых анализах ─────────────────────────────
async def send_lab_results_to_vet(
    vet_email: str, vet_name: str,
    pet_name: str, owner_name: str,
    order_number: str, services: list,
    results: dict = None
):
    subject = f"🔬 Анализы готовы: {pet_name} ({owner_name})"

    services_html = "".join(
        f'<li style="padding:4px 0;color:#1e293b;">{s}</li>' for s in services
    )

    results_rows = ""
    if results:
        for svc, res in results.items():
            val   = res.get("value", "—")
            unit  = res.get("unit", "")
            ref   = res.get("ref", "")
            flag  = res.get("flag", "")
            color = "#dc2626" if flag == "H" else "#2563eb" if flag == "L" else "#166534"
            flag_badge = f'<span style="background:{color};color:#fff;border-radius:4px;padding:1px 6px;font-size:11px;margin-left:6px;">{flag}</span>' if flag else ""
            results_rows += f"""
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:8px 12px;font-size:13px;color:#334155;">{svc}</td>
              <td style="padding:8px 12px;font-size:13px;font-weight:700;color:{color};">{val} {unit}{flag_badge}</td>
              <td style="padding:8px 12px;font-size:12px;color:#94a3b8;">{ref}</td>
            </tr>"""

    body = f"""
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:24px 32px;display:flex;align-items:center;gap:16px;">
        <div style="font-size:32px;">🔬</div>
        <div>
          <h1 style="margin:0;color:#fff;font-size:18px;font-weight:800;">Результаты анализов готовы</h1>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">ГБУ «Городская ветеринарная станция г. Байконур»</p>
        </div>
      </div>
      <div style="padding:24px 32px;">
        <p style="font-size:15px;color:#1e293b;">Уважаемый(ая) <strong>{vet_name}</strong>,</p>
        <p style="font-size:14px;color:#475569;">
          Результаты анализов по заявке <strong>{order_number}</strong> готовы.<br>
          Пациент: <strong>{pet_name}</strong> (владелец: {owner_name})
        </p>

        {'<table style="width:100%;border-collapse:collapse;margin:16px 0;"><thead><tr style="background:#f8fafc;"><th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;">Исследование</th><th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;">Результат</th><th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;">Норма</th></tr></thead><tbody>' + results_rows + '</tbody></table>' if results_rows else f'<ul style="margin:12px 0;padding-left:20px;">{services_html}</ul>'}

        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 16px;margin-top:16px;font-size:13px;color:#9a3412;">
          ⚠ Результаты вшиты в медицинскую карту животного. Пожалуйста, проверьте и при необходимости свяжитесь с владельцем.
        </div>
        <div style="margin-top:20px;padding-top:14px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">
          ГБУ «Городская ветеринарная станция г. Байконур» · ул. Носова, 14
        </div>
      </div>
    </div>
    """
    await send_email(vet_email, subject, body)
