const express = require('express');
const app = express();
const path = require('path');
const oracledb = require('oracledb');
const cors = require('cors');

const dbConfig = {
    user: 'ReadNTrade',
    password: 'hr',
    connectString: 'localhost/orclpdb1'
};


//############################################################
const session = require('express-session');

app.use(session({
    secret: '104113116',  
    resave: false,  
    saveUninitialized: false  
}));


// Define an authentication middleware
function isAuthenticated(req, res, next) {
    
    if (req.session && req.session.user) {
        
        return next();
    } else {
       
        return res.redirect('/index');
    }
}

// use the isAuthenticated middleware for protected routes
app.use(['/dashboard', '/home'], isAuthenticated);

//############################################################

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

//  error handling middleware
app.use((err, req, res, next) => {
    console.error('An error occurred:', err);
    res.status(500).json({ message: 'Internal server error.' });
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

//!!!!!!!!!!!!!!!!!!!!!!
let connectionPool;

oracledb.createPool(dbConfig)
  .then(pool => {
    connectionPool = pool;
  })
  .catch(err => {
    console.error("Error creating OracleDB connection pool:", err);
  });

  async function runQuery(queryR, bind) {
    let connection;
    try {
        connection = await connectionPool.getConnection();
        const result = await connection.execute(queryR, bind);
        await connection.commit();
        return result.rows;
    } catch (error) {
        console.error('Error while running query:', error);
        throw error;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error('Error while closing connection:', error);
            }
        }
    }
}











app.get('/', (req, res) => {
    res.render('index');
});

app.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const queryR = `SELECT * FROM locations`;
        const queryData = await runQuery(queryR, []);
        res.render('dashboard', { queryData });
    } catch (error) {
        console.error('Error while fetching data:', error);
        res.status(500).send('An error occurred while fetching data.');
    }
});

app.get('/signup', (req, res) => {
    res.render('signup');
});

app.get('/index', (req, res) => {
    res.render('index');
});

app.get('/hey', (req, res) => {
    res.render('hey');
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const query = `SELECT * FROM users WHERE email=:email AND password=:password`;
        const result = await runQuery(query, { email, password });
        console.log(result)
        if (result.length > 0) {
            req.session.user = { email: email };  // Set the session
            res.send(result);
        } else {
            res.status(401).json({ message: 'Invalid credentials!' });
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'An error occurred during login.' });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
      if(err) {
        return res.redirect('/home');
      }
      res.redirect('/index'); 
    });
  });


app.post('/signup', async (req, res) => {
    console.log(req.body)
    const { email, password } = req.body;
    try {
        const query0 = `SELECT MAX(userId) FROM users`;
        const result0 = await runQuery(query0, []);
        const cnt = result0[0][0] + 1;
        
        const query = `INSERT INTO users (userid, email, password) VALUES (:cnt, :email, :password)`;
        
        await runQuery(query, [cnt, email, password]);
        res.send({ message: 'Sign up successful!' });
    } catch (error) {
        console.error('Error during sign up:', error);
        res.status(500).json({ message: 'An error occurred during sign up.' });
    }
});
//-------------------------

app.get('/profile', isAuthenticated, async (req, res) => {
    const userEmail = req.session.user.email;  // Fetch the email from the session
    
    try {
        const query = `SELECT * FROM users WHERE email=:email`;
        const profiles = await runQuery(query, { email: userEmail });
        // console.log(profiles)
        if (profiles.length > 0) {
            res.render('profile', { profiles });
        } else {
            res.status(404).send("User profiles not found");
        }
    } catch (error) {
        console.error('Error fetching profiles:', error);
        res.status(500).send('An error occurred while fetching profile data.');
    }
});






// ################################################

app.get('/home', isAuthenticated, async (req, res) => {
    try {
        let userEmail = req.session.user.email; 
        console.log(userEmail)
        let emailName = userEmail
        // let emailName = userEmail.split('@')[0];
        // console.log(emailName)
        res.render('home', {
            emailName: emailName,
            object: null,
        });
    } catch (err) {
        console.log(err);
    }
});




app.post('/home', async (req, res) => {
    try {
        const searchName = req.body.search;
        const selectedOption = req.body.selectedOption;

        // Whitelist of allowed values for dynamic column names
        const allowedOptions = {
            'AuthorName': 'a.AUTHORNAME',
            'PublisherName': 'p.PUBLISHERNAME',
            'BookTitle': 'b.TITLE'
        };

        // validate the selectedOption against the whitelist
        if (!allowedOptions[selectedOption]) {
            return res.status(400).json({ message: 'Invalid selected option.' });
        }

        // Use the whitelisted value from our map
        const columnToSearch = allowedOptions[selectedOption];

        // Use bound parameters for searchName. No need to embed directly in the SQL string.
        const query = `
            SELECT
                b.TITLE AS book_title,
                a.AUTHORNAME AS author_name,
                p.PUBLISHERNAME AS publisher,
                b.PUBLICATIONYEAR AS publication_year,
                b.PRICE AS price,
                u.FIRSTNAME ||' '||u.LASTNAME AS seller_name,
                (s.DISCOUNT*100) AS discount
            FROM
                BOOKS b
            JOIN
                AUTHORS a ON b.AUTHORID = a.AUTHORID
            JOIN
                PUBLISHERS p ON b.PUBLISHERID = p.PUBLISHERID
            JOIN
                SELLS s ON s.BOOKID = b.BOOKID
            JOIN
                USERS u ON s.SELLERID = u.USERID
            WHERE
                TRIM(${columnToSearch}) = TRIM(:searchName)
            ORDER BY discount DESC`;

        // Use the bound parameter :searchName
        const result = await runQuery(query, { searchName });

        res.render('home', {
            object: result || []
        });
    } catch (err) {
        res.send(err.message);
    }
});





// ###########################################
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
