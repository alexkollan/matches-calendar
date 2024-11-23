# **Sports Schedule to Google Calendar**

## **Overview**
This Node.js application fetches sports TV schedules from an undocumented API, processes the data, and adds matches involving specific teams to a Google Calendar. The app avoids duplicate events by using unique identifiers for each match.

---

## **Prerequisites**

### **Tools and Environment**
- **Node.js**: Install Node.js (v14 or newer) from [https://nodejs.org/](https://nodejs.org/).
- **Git**: Ensure Git is installed on your machine.
- **Google Cloud Platform (GCP) Account**: You'll need access to the Google Cloud Console to set up API credentials.

---

## **Setup Instructions**

### **Step 1: Clone the Repository**
```bash
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>
```

---

### **Step 2: Install Dependencies**
```bash
npm install
```

---

### **Step 3: Set Up Google Cloud API Credentials**

1. **Enable the Google Calendar API**:
   - Visit the [Google Cloud Console](https://console.cloud.google.com/).
   - Create a new project (or select an existing project).
   - Go to **APIs & Services > Library**.
   - Search for **Google Calendar API** and enable it for your project.

2. **Create OAuth 2.0 Credentials**:
   - Go to **APIs & Services > Credentials**.
   - Click **Create Credentials > OAuth 2.0 Client ID**.
   - Choose **Desktop App** as the application type.
   - Download the credentials file (JSON format) and save it as \`credentials.json\` in the project root directory.

---

### **Step 4: Authenticate the Application**

1. Run the application:
   ```bash
   node index.js
   ```

2. You’ll see a URL in the console:
   ```
   Authorize this app by visiting this URL: <URL>
   ```

3. Open the URL in your browser, log in with your Google account, and grant the necessary permissions.

4. Copy the authorization code and paste it into the console when prompted. This generates a \`token.json\` file that stores your access token.

   - **Important**: Do not share \`token.json\` or \`credentials.json\` publicly; these files contain sensitive information.

---

### **Step 5: Running the Application**
To fetch TV schedules and add matches to Google Calendar, run:

```bash
node index.js
```

The script will:
1. Fetch sports matches from \`https://www.gazzetta.gr/gztfeeds/tvschedule-v2\`.
2. Filter matches based on specific teams and conditions.
3. Add filtered matches as events to your Google Calendar.

---

## **Project Structure**

```plaintext
project/
├── src/
│   ├── auth.js           # Handles Google OAuth2 authentication
│   ├── calendar.js       # Interacts with Google Calendar (adding events)
│   ├── fetchSchedule.js  # Fetches and processes the TV schedule
│   ├── utils.js          # Utility functions (e.g., createHash)
├── .gitignore            # Excludes sensitive files and unnecessary items from Git
├── index.js              # Entry point for the application
├── credentials.json      # Google OAuth2 credentials file (DO NOT SHARE)
├── token.json            # Google OAuth2 access token (DO NOT SHARE)
├── package.json          # Node.js project metadata
```

---

## **Configuration**

### **Teams to Track**
Update the \`teams\` array in \`fetchSchedule.js\` to include the teams you want to track:

```javascript
const teams = ["ΟΛΥΜΠΙΑΚΟΣ", "ΠΑΝΑΘΗΝΑΙΚΟΣ", "ΕΛΛΑΔΑ"];
```

---

### **Event Filters**
Modify conditions to include or exclude specific sports or leagues:

```javascript
if (
    (match.sport_name === "Ποδόσφαιρο" || match.sport_name === "Μπάσκετ") &&
    teams.some(team => match.participant1?.name?.includes(team) || match.participant2?.name?.includes(team)) &&
    !match.league?.name?.includes("Γυναικών")
)
```

---

### **Event Colors**
Change the Google Calendar event color in \`calendar.js\`:

```javascript
colorId: '2', // Change this to the desired color ID
```

---

## **Debugging**

### **Common Errors**

1. **Error: \`credentials.json\` not found**:
   - Ensure the \`credentials.json\` file is in the project root.

2. **Error: \`token.json\` not found**:
   - Run the app and follow the authentication steps to generate \`token.json\`.

3. **Google API Errors (e.g., \`insufficient permission\`)**:
   - Ensure you’ve enabled the Google Calendar API and granted the app proper permissions.

4. **Endpoint Changes**:
   - If \`https://www.gazzetta.gr/gztfeeds/tvschedule-v2\` stops working, you’ll need to inspect the website for the new JSON feed URL.

---

## **License**

This project is licensed under the MIT License. Note that the data fetched from the undocumented API at \`https://www.gazzetta.gr/gztfeeds/tvschedule-v2\` belongs to its respective owners. Use responsibly.

---

## **Contribution**

Contributions are welcome! Please fork the repository, create a feature branch, and submit a pull request.

---

### **Disclaimer**
This app relies on an undocumented API that may change without notice. If the API endpoint or data format is updated, adjustments will be required in \`fetchSchedule.js\`.

## MIT License

Copyright (c) 2024 Alex Kollan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

DISCLAIMER: This project interacts with an undocumented API at https://www.gazzetta.gr/gztfeeds/tvschedule-v2.
This API is not officially supported or endorsed by its owners. The data retrieved via this API belongs
to its respective owners, and the use of this data may be subject to their terms of service.


