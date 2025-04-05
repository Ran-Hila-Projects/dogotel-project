# 🐾 Dogotel – Dog Boarding Website 

**Dogotel** iis a cloud-based dog boarding website, built as a final project for an advanced AWS course. It allows users to browse available rooms, make bookings, write reviews, and receive confirmation emails – while providing admins with full booking and room management tools. Built with AWS Lambda, Cognito, S3, DynamoDB, API Gateway and more.

---

## 🌟 Main Features

- **User & Admin Authentication:** Sign up and login via AWS Cognito with role-based access.
- **Room Booking:** View room availability and make reservations based on dates and price.
- **Email Confirmation:** Customers receive an automatic email with booking details via Amazon SES.
- **Reviews & Ratings:** Registered users can rate rooms and leave feedback.
- **Admin Dashboard:** Manage room info, availability, and bookings with a clean interface.

---

## ☁️ AWS Services Used

- **Amazon Cognito** – Authentication & Authorization  
- **Amazon S3** – Static web hosting and image storage  
- **AWS Lambda** – Backend logic  
- **Amazon API Gateway** – API layer  
- **Amazon DynamoDB** – NoSQL Database for rooms, users, bookings  
- **Amazon SES** – Email confirmation system  
- **Amazon CloudWatch** – Logs and monitoring  
- **AWS IAM** – Permissions and security  

---

## 🧱 Architecture

![System Architecture Diagram](dogotel-front/assets/images/aws-diagram.png)

---

## 🛠️ Tech Stack

- **Frontend:** JS / HTML / CSS  
- **Backend:** Python with AWS Lambda  
- **Database:** Amazon DynamoDB  
- **Infrastructure:** AWS Lab Environment 
