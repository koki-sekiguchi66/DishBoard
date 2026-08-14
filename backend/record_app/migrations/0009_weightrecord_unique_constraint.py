# 自動生成ではなく手書きのマイグレーション

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('record_app', '0008_custommenu_custommenuitem_mealrecorditem_and_more'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='weightrecord',
            constraint=models.UniqueConstraint(
                fields=['user', 'record_date'],
                name='unique_weight_per_user_per_day',
            ),
        ),
    ]
