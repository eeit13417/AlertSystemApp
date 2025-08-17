**Alert system app :**
- Tracks inventory levels in warehouses or shops and alerts when items fall below reorder levels.

---

**This apps **contain** the following features:**

* Signup
* Login
* Logout
* Add stocks
* View stocks
* Update stocks
* Delete stocks
* search stocks
* Display low-stock warning messages 
* Restock Notification (email)
* edit profile
* edit admin role
* delete admin

---

**Prerequisite:** Please install the following software and create account in following web tools** **

* **Nodejs [**[https://nodejs.org/en](https://nodejs.org/en)]** **
* **Git [**[https://git-scm.com/](https://git-scm.com/)]** **
* **VS code editor** [[https://code.visualstudio.com/](https://code.visualstudio.com/)]** **
* **MongoDB Account** [[https://account.mongodb.com/account/login](https://account.mongodb.com/account/login)]** - In tutorial, we have also showed how can you create account and database: follow step number 2.**
* **GitHub Account** [[https://github.com/signup?source=login](https://github.com/signup?source=login)]** **

---

**Environment Variables:** 
- MONGO_URI=mongodb+srv://MingYuanChen:12345@cluster0.5e2wvii.mongodb.net/AlertSystemApp?retryWrites=true&w=majority&appName=Cluster0
- JWT_SECRET=2J8zqkP7VN6bxzg+Wy7DQZsd3Yx8mF3Bl0kch6HYtFs=
- PORT=5001
- USE_GMAIL=true
- SMTP_USER=mingyuanchen5@gmail.com
- SMTP_PASS=ecoywiypywvxsuhi
- MAIL_FROM="Inventory Bot <mingyuanchen5@gmail.com>"
- CRON_SCHEDULE=0 9 * * *

---


**Login :**
- Username: `minwen0734@gmail.com`
- Password: `1234`

---



**Email Notification Scheduler:** 
The system includes a Low Stock Email Notification feature that automatically sends restock reminder emails on a set schedule.  
You can configure the schedule time in the `.env` file, or trigger it manually via an API endpoint.('/api/stock/notify-now')

---

**1 Clone the Repository:**
- Please run the following code in your terminal. 

- git clone https://github.com/eeit13417/AlertSystemApp.git. 

- cd backend.

- npm install.

**2 create a .env file in the backend folder:** 
- 
- Then, you can use the code to run developing mode.
- npm run dev

**3 Frontend Setup:** 
- cd frontend.
- npm install.
- npm start.