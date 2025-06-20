const { RekognitionClient, DetectLabelsCommand } = require('@aws-sdk/client-rekognition');
const { corsResponse, corsErrorResponse, handlePreflightRequest, extractOriginFromEvent } = require('./cors_utils');

// Initialize AWS client
const rekognitionClient = new RekognitionClient({});

exports.handler = async (event, context) => {
    console.log('Event:', JSON.stringify(event, null, 2));

    try {
        const httpMethod = event.httpMethod;
        const path = event.path;
        const origin = extractOriginFromEvent(event);

        console.log(`Processing ${httpMethod} ${path} from origin: ${origin}`);

        // Handle preflight OPTIONS requests
        if (httpMethod === 'OPTIONS') {
            return handlePreflightRequest(event, origin);
        }

        if (path === '/api/rekognition/detect-breed' && httpMethod === 'POST') {
            return await handleDetectBreed(event);
        } else {
            return corsErrorResponse(404, 'Endpoint not found', origin);
        }
    } catch (error) {
        console.error('Error in rekognition handler:', error);
        return corsErrorResponse(500, 'Internal server error', extractOriginFromEvent(event));
    }
};

async function handleDetectBreed(event) {
    try {
        const origin = extractOriginFromEvent(event);
        const body = JSON.parse(event.body || '{}');
        const { image } = body;

        if (!image) {
            return corsErrorResponse(400, 'Image is required', origin);
        }

        // Convert base64 image to buffer
        let imageBuffer;
        try {
            // Remove data URL prefix if present (data:image/jpeg;base64,)
            const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '');
            imageBuffer = Buffer.from(base64Data, 'base64');
        } catch (error) {
            console.error('Error converting base64 to buffer:', error);
            return corsErrorResponse(400, 'Invalid image format', origin);
        }

        // Call AWS Rekognition to detect labels
        const detectLabelsParams = {
            Image: {
                Bytes: imageBuffer
            },
            MaxLabels: 20,
            MinConfidence: 70
        };

        console.log('Calling Rekognition DetectLabels...');
        const detectLabelsResponse = await rekognitionClient.send(new DetectLabelsCommand(detectLabelsParams));
        
        console.log('Rekognition response:', JSON.stringify(detectLabelsResponse, null, 2));

        // Extract dog-related labels and breeds
        const labels = detectLabelsResponse.Labels || [];
        
        // Look for dog breed information
        let detectedBreed = null;
        let confidence = 0;
        
        // Check for specific dog breeds
        const dogBreeds = [
            'Golden Retriever', 'Labrador Retriever', 'German Shepherd', 'Bulldog',
            'Beagle', 'Poodle', 'Rottweiler', 'Yorkshire Terrier', 'Dachshund',
            'Siberian Husky', 'Shih Tzu', 'Boston Terrier', 'Pomeranian',
            'Australian Shepherd', 'Cocker Spaniel', 'Border Collie', 'Chihuahua',
            'French Bulldog', 'Great Dane', 'Mastiff', 'Boxer', 'Dalmatian',
            'Pit Bull', 'Jack Russell Terrier', 'Maltese', 'Bichon Frise',
            'Schnauzer', 'Basset Hound', 'Newfoundland', 'Saint Bernard',
            'Afghan Hound', 'Greyhound', 'Whippet', 'Bloodhound', 'Pointer',
            'Setter', 'Spaniel', 'Terrier', 'Hound', 'Retriever', 'Shepherd'
        ];

        // Check if any labels match dog breeds
        for (const label of labels) {
            const labelName = label.Name;
            const labelConfidence = label.Confidence;
            
            // Check for exact breed matches - be more specific to avoid false matches
            for (const breed of dogBreeds) {
                const labelLower = labelName.toLowerCase();
                const breedLower = breed.toLowerCase();
                
                // Check for exact matches or specific breed detection
                if (labelLower === breedLower || 
                    (labelLower.includes(breedLower) && breedLower.length > 3) ||
                    (breedLower.includes(labelLower) && labelLower.length > 3 && 
                     !['dog', 'canine', 'pet', 'animal'].includes(labelLower))) {
                    if (labelConfidence > confidence) {
                        detectedBreed = labelName; // Use the actual label from Rekognition
                        confidence = labelConfidence;
                    }
                }
            }
        }

        // If no specific breed found, look for generic "Dog" label
        if (!detectedBreed) {
            const dogLabel = labels.find(label => 
                label.Name.toLowerCase() === 'dog' || 
                label.Name.toLowerCase() === 'canine' ||
                label.Name.toLowerCase().includes('dog')
            );
            
            if (dogLabel) {
                detectedBreed = 'Mixed Breed';
                confidence = dogLabel.Confidence;
            }
        }

        // Prepare response
        if (detectedBreed && confidence > 70) {
            return corsResponse(200, {
                success: true,
                breed: detectedBreed,
                confidence: Math.round(confidence),
                allLabels: labels.map(label => ({
                    name: label.Name,
                    confidence: Math.round(label.Confidence)
                }))
            }, origin);
        } else {
            // Check if there's any dog-related content at all
            const hasDog = labels.some(label => 
                label.Name.toLowerCase().includes('dog') ||
                label.Name.toLowerCase().includes('canine') ||
                label.Name.toLowerCase().includes('pet') ||
                label.Name.toLowerCase().includes('animal')
            );

            if (hasDog) {
                return corsResponse(200, {
                    success: true,
                    breed: 'Unknown Breed',
                    confidence: 50,
                    message: 'Dog detected but breed could not be determined',
                    allLabels: labels.map(label => ({
                        name: label.Name,
                        confidence: Math.round(label.Confidence)
                    }))
                }, origin);
            } else {
                return corsResponse(200, {
                    success: false,
                    error: 'No dog detected in the image',
                    allLabels: labels.map(label => ({
                        name: label.Name,
                        confidence: Math.round(label.Confidence)
                    }))
                }, origin);
            }
        }

    } catch (error) {
        console.error('Error in handleDetectBreed:', error);
        return corsErrorResponse(500, 'Failed to analyze image', extractOriginFromEvent(event));
    }
} 