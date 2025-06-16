import json
import boto3
import os
from decimal import Decimal

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')

# Environment variables
DINING_TABLE = os.environ.get('DYNAMODB_TABLE_DINING', 'dogotel-dining-dev')
SERVICES_TABLE = os.environ.get('DYNAMODB_TABLE_SERVICES', 'dogotel-services-dev')

dining_table = dynamodb.Table(DINING_TABLE)
services_table = dynamodb.Table(SERVICES_TABLE)

def lambda_handler(event, context):
    """Initialize dining and services data"""
    try:
        create_dining_options()
        create_service_options()
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Dining and services data initialized successfully'
            })
        }
        
    except Exception as e:
        print(f"Error initializing data: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Failed to initialize data'
            })
        }

def create_dining_options():
    """Create sample dining options"""
    dining_options = [
        {
            'dining_id': 'full-day-meals',
            'id': 'full-day-meals',
            'title': 'Full Day Meals',
            'description': 'Complete meal package including breakfast, lunch, and dinner for your furry friend',
            'price': Decimal('25.00'),
            'details': 'Premium quality meals tailored to your dog\'s dietary needs. Includes organic ingredients and fresh water.',
            'included': ['Breakfast', 'Lunch', 'Dinner', 'Fresh water', 'Dietary accommodations'],
            'available': True
        },
        {
            'dining_id': 'premium-treats',
            'id': 'premium-treats',
            'title': 'Premium Treats Package',
            'description': 'Special treats and snacks throughout the day',
            'price': Decimal('15.00'),
            'details': 'Healthy and delicious treats made from natural ingredients.',
            'included': ['Morning treats', 'Afternoon snacks', 'Evening rewards'],
            'available': True
        },
        {
            'dining_id': 'special-diet',
            'id': 'special-diet',
            'title': 'Special Diet Meals',
            'description': 'Customized meals for dogs with special dietary requirements',
            'price': Decimal('35.00'),
            'details': 'Veterinarian-approved meals for dogs with allergies, sensitivities, or specific health needs.',
            'included': ['Customized meals', 'Nutritional consultation', 'Dietary monitoring'],
            'available': True
        }
    ]
    
    for dining_option in dining_options:
        dining_table.put_item(Item=dining_option)
        print(f"Created dining option: {dining_option['title']}")

def create_service_options():
    """Create sample service options"""
    service_options = [
        {
            'service_id': 'grooming',
            'id': 'grooming',
            'title': 'Grooming Service',
            'description': 'Professional grooming to keep your dog fresh, clean, and fluffy',
            'price': Decimal('30.00'),
            'details': 'Full grooming service including bath, brush, nail trim, and styling.',
            'included': ['Shampoo & bath', 'Brushing', 'Nail trimming', 'Ear cleaning', 'Basic styling'],
            'duration': '2 hours',
            'available': True
        },
        {
            'service_id': 'fitness-training',
            'id': 'fitness-training',
            'title': 'Fitness Training',
            'description': 'Exercise and training sessions to keep your dog active and healthy',
            'price': Decimal('20.00'),
            'details': 'Personalized exercise routines and basic training sessions.',
            'included': ['Exercise session', 'Basic commands training', 'Playtime', 'Health monitoring'],
            'duration': '1 hour',
            'available': True
        },
        {
            'service_id': 'veterinary-checkup',
            'id': 'veterinary-checkup',
            'title': 'Veterinary Checkup',
            'description': 'Basic health checkup by our licensed veterinarian',
            'price': Decimal('50.00'),
            'details': 'Comprehensive health examination to ensure your dog\'s wellbeing.',
            'included': ['Physical examination', 'Health assessment', 'Basic vaccinations', 'Health report'],
            'duration': '30 minutes',
            'available': True
        },
        {
            'service_id': 'playtime-session',
            'id': 'playtime-session',
            'title': 'Extended Playtime',
            'description': 'Extra playtime and socialization with other dogs',
            'price': Decimal('15.00'),
            'details': 'Supervised play sessions in our secure play areas.',
            'included': ['Group play', 'Toy activities', 'Socialization', 'Supervised fun'],
            'duration': '1 hour',
            'available': True
        },
        {
            'service_id': 'dog-walking',
            'id': 'dog-walking',
            'title': 'Dog Walking Service',
            'description': 'Individual or group walks around our beautiful grounds',
            'price': Decimal('12.00'),
            'details': 'Regular walks to ensure your dog gets adequate exercise and fresh air.',
            'included': ['Individual walk', 'Fresh air', 'Exercise', 'Photo updates'],
            'duration': '30 minutes',
            'available': True
        }
    ]
    
    for service_option in service_options:
        services_table.put_item(Item=service_option)
        print(f"Created service option: {service_option['title']}") 