# ExpertDesk Architecture

## Stack

Frontend: Next.js

Backend: Next.js Server Actions / Route Handlers

Database: PostgreSQL

ORM: Prisma

Authentication: Auth.js / custom JWT auth

File Storage: S3 / Cloudinary / local for MVP

Deployment:
- Frontend: Vercel
- Database: Neon
- File storage: TBD

## Main Entities

- User
- Organization
- Project
- ProjectMember
- Document
- DocumentVersion
- Comment
- AuditLog

## Basic Idea

ExpertDesk is a platform where organizations manage construction preparation projects, documents, document versions, reviews, comments, and activity history.

Users belong to organizations.
Organizations have projects.
Projects have members.
Projects contain documents.
Documents can have versions.
Documents can be reviewed, approved, rejected, and commented on.
Important actions are saved in audit logs.