from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

out = Path('artifacts/ai-check')
out.mkdir(parents=True, exist_ok=True)
font_path = 'C:/Windows/Fonts/arial.ttf'
font_bold_path = 'C:/Windows/Fonts/arialbd.ttf'

def make(filename, lines):
    image = Image.new('RGB', (1200, 1000), '#fffaf0')
    draw = ImageDraw.Draw(image)
    y = 70
    for text, size, bold in lines:
        font = ImageFont.truetype(font_bold_path if bold else font_path, size)
        draw.text((70, y), text, fill='#202020', font=font)
        y += size + 34
    image.save(out / filename)

make('package-name.png', [
    ('Творожок', 104, True),
    ('КЛАССИЧЕСКИЙ', 72, True),
    ('5% жирности', 58, False),
    ('100 г', 48, False),
])
make('package-nutrition.png', [
    ('Пищевая ценность на 100 г', 54, True),
    ('Энергетическая ценность: 121 ккал', 48, False),
    ('Белки: 8,0 г', 52, False),
    ('Жиры: 4,2 г', 52, False),
    ('Углеводы: 13,0 г', 52, False),
    ('Кальций: 120 мг', 48, False),
    ('Состав: молоко, закваска.', 44, False),
])
print('Созданы проверочные изображения упаковки')
