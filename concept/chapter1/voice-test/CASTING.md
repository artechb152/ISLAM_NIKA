> ⛔ **לא בשימוש.** המשתמשת ביטלה את הקריינות כולה ב־2026-08-07 אחרי ששמעה סצנה מדובבת בהקשר.
> אין קול במשחק — לא קריין ולא דמויות. הקובץ נשמר לתיעוד בלבד; אל תחזירו קול בלי בקשה מפורשת.

# ליהוק קולות — פרק 1 · הוכרע 2026-08-06

מנוע: **ElevenLabs** דרך Higgsfield `text2speech_v2` (variant `elevenlabs`, voice_type `preset`).
נבחר על ידי המשתמשת מתוך דף ההשוואה `casting.html` (שני מועמדים לדמות, שורות אמיתיות מהמקור).

| דמות | קול | voice_id |
|---|---|---|
| רָאוִי | Cody | `1ffcdbb3-078b-5491-959d-359e3021e917` |
| שליח האימפריה | Alistair | `d9d5c263-f84e-4752-97b5-3750fcc6fd2f` |
| ראש השבט | Fraser | `6705e465-7b52-5915-a1d8-b1222885e01d` |
| הסוחר | Grady | `e2a2d2e6-9ed2-59cd-82af-feaa27f8a678` |
| הסוחר היהודי | Gideon | `1ad38ba4-9cc4-4f2f-9fde-b0fefdf67ae5` |
| הנזיר | Desmond | `563f728c-e249-5a85-97ab-8461e8c09da6` |
| קריין | Xavier | `43173c95-3ec8-446a-a162-6504332c578b` |

פקודת ייצור לשורה:
```
higgsfield generate create text2speech_v2 --variant elevenlabs --voice_type preset --voice_id <id> --prompt "<השורה>" --wait --json
```
עלות: ~0.45 קרדיט לשורה. הדוגמיות שנוצרו בליהוק — בתיקיית `casting/`.
