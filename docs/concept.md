# Strong Gym app

The purpose of this app is to allow customers of this gym to track progress of their attendance, participate in monthly fitness challenges, and to get access to the social media feeds from the trainers themselves. 

This will be require the application to have Users and User Session Context. 
Inside user sessions, a user will be provided with
- Their attendance record presented in the visual form of a github heat map. 
- Access to the competition of the month, where users can view what the activity is and send their submission to the leaderboard.
- a compiled feed that takes the social media posts by the trainers and aggregates them into a single source for the user.
- a total number of points that they have earned as part of the gyms "loyalty point" system


This will also require the concept of an Administrator user.
Admin users can:
- Create, Update, and Close the competition of the month
- Assign the winner of the competition of the month
- Post articles to the feed for users to consume.

The apps first version will be a web app. I want it to use Vercel so it can be a NextJs frotn end, NextJs API for server actions, and use MongoDB cluster as my database. The admin panel will be built into the same app with admin-only routes.

It will need Security around SSO, role-based access control, and admin log-in.

