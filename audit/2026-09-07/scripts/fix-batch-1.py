# תיקוני P1 מדוחות הוועדה — לשון, מיקרו־קופי ותוכן שאינו תואם עוד את המשחק.
import io, json, os
W = '/Users/nikagreenbaum/ISLAM_NIKA/web/'
def sub(path, old, new, n=1):
    p = W + path
    s = io.open(p, encoding='utf-8').read()
    assert old in s, f'לא נמצא ב-{path}: {old[:60]}'
    io.open(p, 'w', encoding='utf-8').write(s.replace(old, new, n))
    print('✓', path)

# L: המחברת שולחת למקש F שכבר אינו קיים — E הוא המקש היחיד
sub('src/components/chapter1/Notebook.tsx',
    'עוד לא נאספה עדות. חפצים שאפשר להביט בהם מקרוב מסומנים בנקודת זהב — F.',
    'עוד לא נאספה עדות. חפצים שאפשר להביט בהם מקרוב מסומנים באור על הקרקע — התקרבו ולחצו E.')

# L: שורת הסיום של מכה סיכמה חידון שמות שירד מן המשחק
sub('src/lib/chapter1/tasks.ts',
    "    done: 'רשמתי: אללאת, אלעזה ומנאת — ונחשבו לבנותיו של אללה.',",
    "    done:\n"
    "      'רשמתי את ההבחנה: האבן החקוקה היא בת זמנה, והפסוק והדף המאוחר מספרים עליה מרחוק. '  +\n"
    "      'שלושתם מקורות — ולא אותו סוג של עדות.',")

# L: „דרך השיירות" בשערים מול „הדרך והעמסה" בשם האזור — שם אחד
for f, old, new in [
    ('src/lib/chapter1/narrow-pass-layout.json', '"label": "הלאה אל דרך השיירות"', '"label": "הלאה אל הדרך והעמסה"'),
    ('src/lib/chapter1/yathrib-layout.json', '"label": "בחזרה אל דרך השיירות"', '"label": "בחזרה אל הדרך והעמסה"'),
]:
    sub(f, old, new)

# L: שם המלווה נכתב „ראאווי" בטקסט הגלוי ו„רָאוִי" בכל השאר
sub('src/components/chapter1/Game.tsx',
    "{ source: '', text: 'שלום עליך, נוסע! חיכיתי לך. ראאווי שמי — מלווה שיירות, ואוסף סיפורים.' },",
    "{ source: '', text: 'שלום עליך, נוסע! חיכיתי לך. רָאוִי שמי — מלווה שיירות, ואוסף סיפורים.' },")
sub('src/components/chapter1/Game.tsx',
    "      prompt: 'ראאווי — זה שם?',",
    "      prompt: 'רָאוִי — זה שם?',")
sub('src/components/chapter1/Game.tsx',
    "{ source: '', text: 'זה גם שם וגם מקצוע: ראאווי פירושו מוסר־סיפורים.",
    "{ source: '', text: 'זה גם שם וגם מקצוע: רָאוִי פירושו מוסר־סיפורים.")

# L: שאלת שלב הפעולה הוצגה גם בשלב הפירוש, מעל שאלת הפירוש עצמה
sub('src/components/chapter1/TaskPanel.tsx',
    '        <p className="ch1-task-question">{task.question}</p>',
    '        {/* שאלת הפעולה שייכת לשלב הפעולה. בשלב הפירוש היא עמדה מעל\n'
    '            שאלת הפירוש, ושתי שאלות זו מעל זו נקראות כשאלה אחת מבולבלת. */}\n'
    '        {!(phase === \'interpret\' && task.interpret) && (\n'
    '          <p className="ch1-task-question">{task.question}</p>\n'
    '        )}')
print('הכול הוחל')
