from rest_framework import serializers
from .models import MealRecord, MealRecordItem, CustomMenu, CustomMenuItem, StandardFood, CustomFood, WeightRecord, CafeteriaMenu
from django.contrib.auth.models import User
from django.db import transaction

class CustomFoodSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomFood
        fields = '__all__'
        read_only_fields = ('user', 'created_at')

class WeightRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeightRecord
        fields = '__all__'
        read_only_fields = ('user', 'id', 'created_at', 'updated_at')

class UserRegistrationSerializer(serializers.ModelSerializer):
    confirm_password = serializers.CharField(style={'input_type': 'password'}, write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'confirm_password']
        extra_kwargs = {
            'password': {'write_only': True, 'min_length': 8}
        }
    
    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("パスワードが一致しません。")
        if len(data['password']) < 8:
            raise serializers.ValidationError("パスワードは8文字以上で入力してください。")
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        user = User.objects.create_user(**validated_data)
        return user

class CafeteriaMenuSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    class Meta:
        model = CafeteriaMenu
        fields = '__all__'


class MealRecordItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MealRecordItem
        fields = [
            'id', 'item_type', 'item_id', 'item_name', 'amount_grams',
            'display_order', 'calories', 'protein', 'fat', 'carbohydrates',
            'dietary_fiber', 'sodium', 'calcium', 'iron',
            'vitamin_a', 'vitamin_b1', 'vitamin_b2', 'vitamin_c',
        ]
        read_only_fields = ['id']

class MealRecordSerializer(serializers.ModelSerializer):
    items = MealRecordItemSerializer(many=True, required=False)
    
    class Meta:
        model = MealRecord
        fields = [
            'id', 'user', 'record_date', 'meal_timing', 'meal_name',
            'calories', 'protein', 'fat', 'carbohydrates',
            'dietary_fiber', 'sodium', 'calcium', 'iron',
            'vitamin_a', 'vitamin_b1', 'vitamin_b2', 'vitamin_c',
            'created_at', 'updated_at', 'items',  
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']
    
    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        if 'user' not in validated_data:
            validated_data['user'] = self.context['request'].user

        meal_record = MealRecord.objects.create(**validated_data)
        
        if items_data:
            MealRecordItem.objects.bulk_create([
                MealRecordItem(meal_record=meal_record, **item_data)
                for item_data in items_data
            ])
        
        return meal_record
    
    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if items_data is not None:
            instance.items.all().delete()
            if items_data:
                MealRecordItem.objects.bulk_create([
                    MealRecordItem(meal_record=instance, **item_data)
                    for item_data in items_data
                ])
        
        return instance

class MealRecordListSerializer(serializers.ModelSerializer):
    items_count = serializers.SerializerMethodField()
    
    class Meta:
        model = MealRecord
        fields = [
            'id', 'record_date', 'meal_timing', 'meal_name',
            'calories', 'protein', 'fat', 'carbohydrates',
            'items_count', 'created_at',
        ]
    
    def get_items_count(self, obj):
        return obj.items.count()


class CustomMenuItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomMenuItem
        fields = '__all__'
        read_only_fields = ['id', 'custom_menu']

class CustomMenuSerializer(serializers.ModelSerializer):   
    items = CustomMenuItemSerializer(many=True, required=True)
    
    class Meta:
        model = CustomMenu
        fields = '__all__'
        read_only_fields = [
            'id', 'user', 'created_at', 'updated_at',
            'total_calories', 'total_protein', 'total_fat', 'total_carbohydrates',
            'total_dietary_fiber', 'total_sodium', 'total_calcium', 'total_iron',
            'total_vitamin_a', 'total_vitamin_b1', 'total_vitamin_b2', 'total_vitamin_c',
        ]
    
    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("少なくとも1つのアイテムが必要です")
        return value
    
    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        custom_menu = CustomMenu.objects.create(**validated_data)
        
        CustomMenuItem.objects.bulk_create([
            CustomMenuItem(custom_menu=custom_menu, **item_data)
            for item_data in items_data
        ])
        
        custom_menu.calculate_totals()
        custom_menu.save()
        return custom_menu
    
    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        
        instance.name = validated_data.get('name', instance.name)
        instance.description = validated_data.get('description', instance.description)
        
        if items_data is not None:
            instance.items.all().delete()
            if items_data:
                CustomMenuItem.objects.bulk_create([
                    CustomMenuItem(custom_menu=instance, **item_data)
                    for item_data in items_data
                ])
            instance.calculate_totals()
        
        instance.save()
        return instance

class CustomMenuListSerializer(serializers.ModelSerializer):
    items_count = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomMenu
        fields = [
            'id', 'name', 'description', 'items_count',
            'total_calories', 'total_protein', 'total_fat', 'total_carbohydrates',
            'created_at', 'updated_at',
        ]
    
    def get_items_count(self, obj):
        return obj.items.count()