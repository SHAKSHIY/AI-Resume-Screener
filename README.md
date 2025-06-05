# AI Resume Screening Chatbot
An intelligent resume screening assistant that helps HR professionals quickly shortlist top candidates, score resumes based on job descriptions, and manage initial communications. Built for efficiency, accuracy, and flexibility in the hiring process.

## Overview
Hiring the right talent is critical—and time-consuming. This AI-powered chatbot automates the initial screening process using NLP and scoring algorithms, saving HR teams countless hours while improving candidate matching accuracy.

## Features
🔹 Multiple Resume Uploads

Easily upload multiple resumes (PDF format supported) for bulk processing.

🔹 Dynamic Resume Scoring

Resumes are scored against a provided job description using NLP and embedding-based techniques.

🔹 Custom Weightage System

HRs can assign dynamic weightage (out of 100) to various factors like skills, experience, education, etc.

🔹 Cut-Off Based Shortlisting

Automatically shortlists candidates who score above a configurable threshold.

🔹 Email Invitations to Selected Candidates

Send interview invitations to selected candidates via checkbox-based selection.

🔹 Interactive Chatbot Interface

Ask the bot about a candidate's skills, email, or experience. It responds contextually using extracted data.

## Tech Stack
Layer	Tools/Technologies

Frontend	HTML, CSS, JavaScript (Vanilla/Bootstrap)

Backend	FastAPI (Python)

Parsing/Matching	spaCy, SentenceTransformers

Email Integration	smtplib, email

Resume Processing	PyMuPDF, pdfminer
