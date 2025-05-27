@echo off

:: Start the frontend and backend in separate tabs using Windows Terminal
wt new-tab -p "Command Prompt" --title "Frontend" cmd /k "cd c:\Users\kolla\Documents\GitHub\matches-calendar\frontend && npm run dev" ; new-tab -p "Command Prompt" --title "Backend" cmd /k "node c:\Users\kolla\Documents\GitHub\matches-calendar\unifiedServer.js"
