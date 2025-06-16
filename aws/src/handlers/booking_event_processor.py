import json
import boto3
import os
from datetime import datetime
from decimal import Decimal

# Initialize AWS clients
sns = boto3.client('sns')

# Environment variables
BOOKING_CONFIRMATION_TOPIC_ARN = os.environ.get('BOOKING_CONFIRMATION_TOPIC_ARN')

def lambda_handler(event, context):
    """Process booking events from SQS and publish to SNS"""
    try:
        # Process each SQS record
        for record in event['Records']:
            process_booking_event(record)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': f'Processed {len(event["Records"])} booking events'
            })
        }
        
    except Exception as e:
        print(f"Error processing booking events: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Failed to process booking events'
            })
        }

def process_booking_event(record):
    """Process a single booking event record"""
    try:
        # Parse the SQS message
        message_body = json.loads(record['body'])
        event_type = message_body.get('event_type')
        
        print(f"Processing booking event: {event_type}")
        
        if event_type == 'booking_created':
            handle_booking_created(message_body)
        else:
            print(f"Unknown event type: {event_type}")
            
    except Exception as e:
        print(f"Error processing booking event record: {str(e)}")
        raise

def handle_booking_created(booking_event):
    """Handle booking created event"""
    try:
        booking = booking_event['booking']
        room = booking_event['room']
        user_email = booking_event['user_email']
        user_name = booking_event['user_name']
        
        # Create email content
        subject = f"Booking Confirmation - Dogotel #{booking['booking_id'][:8]}"
        
        email_body = f"""
Dear {user_name},

Your booking has been confirmed!

Booking Details:
- Booking ID: {booking['booking_id']}
- Room: {room.get('name', 'Room')}
- Check-in: {booking['check_in']}
- Check-out: {booking['check_out']}
- Guests: {booking['guest_count']}
- Total Cost: ${float(booking['total_cost']):.2f}

Thank you for choosing Dogotel!

Best regards,
The Dogotel Team
        """
        
        # Create SNS message
        sns_message = {
            'event_type': 'booking_confirmation',
            'user_email': user_email,
            'user_name': user_name,
            'subject': subject,
            'body': email_body,
            'booking_id': booking['booking_id'],
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Publish to SNS topic
        if BOOKING_CONFIRMATION_TOPIC_ARN:
            response = sns.publish(
                TopicArn=BOOKING_CONFIRMATION_TOPIC_ARN,
                Message=json.dumps(sns_message),
                Subject=subject,
                MessageAttributes={
                    'event_type': {
                        'DataType': 'String',
                        'StringValue': 'booking_confirmation'
                    },
                    'user_email': {
                        'DataType': 'String',
                        'StringValue': user_email
                    }
                }
            )
            
            print(f"Booking confirmation published to SNS. MessageId: {response['MessageId']}")
        else:
            print("SNS topic ARN not configured")
            
    except Exception as e:
        print(f"Error handling booking created event: {str(e)}")
        raise

def convert_decimals(obj):
    """Convert Decimal objects to float for JSON serialization"""
    if isinstance(obj, list):
        return [convert_decimals(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: convert_decimals(value) for key, value in obj.items()}
    elif isinstance(obj, Decimal):
        return float(obj)
    else:
        return obj 