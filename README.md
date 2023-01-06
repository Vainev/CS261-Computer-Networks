# CS261-Computer-Networks
Handouts, Postman tests, majority of the code for the game folder in assignment 6 was provided by instructor. In the game folder, I updated UserLoginState.cpp to perform a series of actions:
- Login
- Retrive login response data
- Use the login data plus game type to call connect on the user service, and extract data from the connect response and store it in the client configuration.

HostingMenuState.cpp was also updated to calculate the token from the values sent by the cient plus game type and secret.

Assignment 6 uses Nginx and PM2, which were done through MobaXterm. The AWS EC2 server it ran on is no longer available. 
