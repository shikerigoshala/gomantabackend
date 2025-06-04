@echo off
echo Building Gavshala Donation Platform for production...

echo Setting NODE_ENV to production
set NODE_ENV=production

echo Installing frontend dependencies...
call npm install

echo Building frontend...
call npm run build

echo Installing server dependencies...
cd server
call npm install

echo Build complete!
echo.
echo To deploy:
echo 1. Copy the 'build' folder to your production server
echo 2. Copy the 'server' folder to your production server
echo 3. Set up environment variables on your server
echo 4. Start the server with: NODE_ENV=production npm start
echo.
echo See DEPLOYMENT.md for detailed instructions

pause
