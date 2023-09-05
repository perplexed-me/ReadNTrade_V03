const express = require('express');
const app = express();
const path = require('path');
const oracledb = require('oracledb');
const cors = require('cors');
const session = require('express-session');
const { Server } = require('socket.io');


const dbConfig = {
    user: 'ReadNTrade',
    password: 'hr',
    connectString: 'localhost/orclpdb1',
    poolMax: 20,
    poolMin: 10,
    poolIncrement: 2,
    poolTimeout: 300,
    queueTimeout: 60000
};


//############################################################
//             Authentication
//############################################################


app.use(session({
    secret: '104113116',
    resave: false,
    saveUninitialized: false
}));


// an authentication middleware
function isAuthenticated(req, res, next) {

    if (req.session && req.session.user) {

        return next();
    } else {

        return res.redirect('/index');
    }
}


//############################################################
//              app.use 
//############################################################

// use the isAuthenticated middleware for protected routes
app.use(['/dashboard', '/home'], isAuthenticated);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

//  error handling middleware
app.use((err, req, res, next) => {
    console.error('An error occurred:', err);
    res.status(500).json({ message: 'Internal server error.' });
});


//############################################################
//             app.set
//############################################################


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


//############################################################
//               DataBase
//############################################################
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


async function runQueries(queries, bindParams) {
    let connection;
    try {
        connection = await connectionPool.getConnection();

        const results = await Promise.all(queries.map(query => connection.execute(query, bindParams)));

        // Check if any of the queries were modifying the database and hence need a commit
        const needCommit = queries.some(query => !query.trim().toLowerCase().startsWith('select'));
        if (needCommit) {
            await connection.commit();
        }

        // Return the rows from each result
        return results.map(result => result.rows);
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


//############################################################
//                Access
//############################################################


app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const query = `SELECT * FROM users WHERE email=:email AND password=:password`;
        const result = await runQuery(query, { email, password });

        if (result.length > 0) {
            req.session.user = {
                email: email,
                userID: result[0][0],
                userName: result[0][4] + ' ' + result[0][5]
            };
            // console.log(req.session.user.userName)

            res.send(result)
        }

        else {
            res.status(401).json({ message: 'Invalid credentials!' });
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'An error occurred during login.' });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.redirect('/home');
        }
        res.redirect('/index');
    });
});


app.post('/signup', async (req, res) => {

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



//############################################################
//             GET METHOD
//############################################################

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/index', (req, res) => {
    res.render('index');
});

app.get('/signup', (req, res) => {
    res.render('signup');
});



/*
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
*/



app.get('/profile', async (req, res) => {
    try {
        let userID = req.session.user.userID;
        let userName = req.session.user.userName;

        const bindParams = {
            UserID: { val: userID, type: oracledb.NUMBER }
        };

        const queries = [
            `SELECT u.FIRSTNAME||' '||u.LASTNAME AS Name, u.EMAIL, l.DISTRICT, l.DIVISION FROM USERS u LEFT JOIN LOCATIONS l ON u.LOCATIONID = l.LOCATIONID WHERE u.UserID=:UserID`,
            `SELECT SUM(PRICE) FROM ORDERS GROUP BY SELLERID HAVING SELLERID =:UserID`,
            `SELECT COUNT(BOOKID) FROM ORDERS GROUP BY SELLERID HAVING SELLERID =:UserID`,
            `SELECT COUNT(BOOKID) FROM SELLS GROUP BY SELLERID HAVING SELLERID=:UserID`,
            `SELECT COUNT(BOOKID) FROM ORDERS GROUP BY BUYERID HAVING BUYERID=:UserID`
        ];

        const [result1, result2, result3, result4, result5] = await runQueries(queries, bindParams);

        res.render('profile', {
            detail: result1,
            userID: userID,
            userName: userName || null,
            money: result2[0] || 0,
            soldCount: result3[0] || 0,
            toSellcount: result4[0] || 0,
            orderCount: result5[0] || 0
        });
    } catch (err) {
        res.send(err.message);
    }
});


app.post('/profile', async (req, res) => {
    try {
        let userID = req.session.user.userID;

        const fname = req.body.cngfname;
        const lname = req.body.cnglname;
        const email = req.body.cngmail;
        const division = req.body.division;
        const district = req.body.district;

        const connection = await connectionPool.getConnection();

        if (fname != undefined && lname != undefined) {
            const bindParams1 = {
                UserID: { val: userID, type: oracledb.NUMBER },
                fName: { val: fname, type: oracledb.STRING },
                lName: { val: lname, type: oracledb.STRING },
            }
            const query0 = `UPDATE USERS
                          SET FIRSTNAME = :fName,
                              LASTNAME =:lName
                          WHERE USERID=:UserID`;
            const result0 = await connection.execute(query0, bindParams1, { autoCommit: true });
        }
        if (email != undefined) {
            const bindParams1 = {
                UserID: { val: userID, type: oracledb.NUMBER },
                Email: { val: email, type: oracledb.STRING },
            }
            const query0 = `UPDATE USERS
                          SET EMAIL = :Email
                          WHERE USERID=:UserID`;
            const result0 = await connection.execute(query0, bindParams1, { autoCommit: true });
        }
        if (division != undefined && district != undefined) {
            const bindParams1 = {
                UserID: { val: userID, type: oracledb.NUMBER },
                District: { val: district, type: oracledb.STRING },
            }
            const query0 = `UPDATE USERS
                          SET LOCATIONID = (SELECT LOCATIONID FROM LOCATIONS
                            WHERE DISTRICT=:District)
                          WHERE USERID=:UserID`;
            const result0 = await connection.execute(query0, bindParams1, { autoCommit: true });
        }
        const bindParams = {
            UserID: { val: userID, type: oracledb.NUMBER },
        };
        //duplicate
        const query1 = `SELECT u.FIRSTNAME||' '||u.LASTNAME AS Name, 
                      u.EMAIL,l.DISTRICT,l.DIVISION FROM USERS u 
                      LEFT JOIN LOCATIONS l ON u.LOCATIONID = l.LOCATIONID 
                      WHERE u.UserID=:UserID`;
        //duplicate
        const query2 = `SELECT  SUM(PRICE) FROM ORDERS GROUP BY SELLERID
                      HAVING  SELLERID =:UserID `;
        //duplicate
        const query3 = `SELECT  COUNT(BOOKID) FROM ORDERS GROUP BY SELLERID
                      HAVING SELLERID =:UserID `;
        //duplicate
        const query4 = `SELECT  COUNT(BOOKID) FROM SELLS GROUP BY SELLERID 
                      HAVING SELLERID=:UserID `;
        //duplicate
        const query5 = `SELECT  COUNT(BOOKID) FROM ORDERS GROUP BY BUYERID 
                      HAVING BUYERID=:UserID `;
        const result1 = await connection.execute(query1, bindParams);
        const result2 = await connection.execute(query2, bindParams);
        const result3 = await connection.execute(query3, bindParams);
        const result4 = await connection.execute(query4, bindParams);
        const result5 = await connection.execute(query5, bindParams);
        // console.log(result1.rows[0]);
        // console.log(result2.rows[0]);
        // console.log(result3.rows[0]);
        // console.log(result4.rows[0]);
        res.render('profile', {
            detail: result1.rows,
            money: result2.rows,
            soldCount: result3.rows,
            toSellcount: result4.rows,
            orderCount: result5.rows
        });
    } catch (err) {
        res.send(err.message);
    }

});





//############################################################
//                HOME PAGE
//############################################################
app.get('/home', isAuthenticated, async (req, res) => {
    try {
        let userEmail = req.session.user.email;
        const query = `SELECT * FROM users WHERE email=:email`;
        const profiles = await runQuery(query, { email: userEmail });

        req.session.profiles = profiles;
        let userID = profiles[0][0];
        // console.log(userID);
        let userName = profiles[0][4] + " " + profiles[0][5]
        // console.log(name)

        if (profiles.length > 0) {

            res.render('home', {
                profiles: profiles,
                userID: userID,
                userName: userName,
                decide: 0,
                object: null,
            });
        }

    } catch (err) {
        console.log(err);
    }
});




app.post('/home', async (req, res) => {
    try {
        let decide = 1;
        const searchName = req.body.search;
        const selectedOption = req.body.selectedOption;
        // console.log(selectedOption);
        let t;
        if (selectedOption === 'AuthorName') {
            t = 'a';
        } else if (selectedOption === 'PublisherName') {
            t = 'p';
        } else {
            t = 'b';
        }
        const bindParams = {
            SearchName: { val: searchName, type: oracledb.STRING }
        }
        const connection = await connectionPool.getConnection();
        // const query1 = SELECT CATEGORY,SUBCATEGORY,BRAND FROM PRODUCTS;
        let query;
        if (selectedOption === 'PublicationYear') {
            query = `SELECT b.TITLE AS book_title, a.AUTHORNAME AS author_name,
                         p.PUBLISHERNAME AS publisher, b.PUBLICATIONYEAR AS publication_year,
                         b.PRICE AS price, u.FIRSTNAME ||' '||u.LASTNAME AS seller_name,
                         (s.DISCOUNT*100) AS discount,u.USERID as userID
                        FROM BOOKS b
                        JOIN AUTHORS a ON b.AUTHORID = a.AUTHORID
                        JOIN PUBLISHERS p ON b.PUBLISHERID = p.PUBLISHERID
                        JOIN SELLS s ON s.BOOKID = b.BOOKID
                        JOIN USERS u ON s.SELLERID = u.USERID
                        WHERE ${t}.${selectedOption} = :SearchName`;
        } else {
            query = `SELECT b.TITLE AS book_title, a.AUTHORNAME AS author_name,
                          p.PUBLISHERNAME AS publisher, b.PUBLICATIONYEAR AS publication_year,
                          b.PRICE AS price, u.FIRSTNAME ||' '||u.LASTNAME AS seller_name,
                          (s.DISCOUNT*100) AS discount,u.USERID as userID
                        FROM BOOKS b
                        JOIN AUTHORS a ON b.AUTHORID = a.AUTHORID
                        JOIN PUBLISHERS p ON b.PUBLISHERID = p.PUBLISHERID
                        JOIN SELLS s ON s.BOOKID = b.BOOKID
                        JOIN USERS u ON s.SELLERID = u.USERID
                        WHERE ${t}.${selectedOption} LIKE '%'||:SearchName ||'%'`;
        }
        const result = await connection.execute(query, bindParams);
        // const reslt={
        //     result: result.rows,
        // };
        // objectget=result.rows;

        connection.release();
        console.log('Retrieved data:', result);

        res.render('home', {
            object: result.rows,
            profiles: null,
            decide: decide,
            iterators: -1,
        });
    } catch (err) {
        res.send(err.message);
    }
});


//############################################################
//            Add
//############################################################

app.get('/add', (req, res) => {
    decide = 0;
    res.render('add', {
        decide: decide,
    });
});

app.post('/add', async (req, res) => {
    try {
        decide = 1;
        const userID = req.session.user.userID;
        const title = req.body.Title;
        const author = req.body.Author;
        const publisher = req.body.Publisher;
        const Year1 = req.body.Year;
        const year = parseInt(Year1, 10)
        const Price1 = req.body.Price;
        const price = parseInt(Price1, 10);
        const Discount1 = req.body.Discount;
        let discount = parseFloat(Discount1);
        discount = discount / 100.0;
        const connection = await connectionPool.getConnection();
        // const query1 = SELECT CATEGORY,SUBCATEGORY,BRAND FROM PRODUCTS;
        const query1 = `SELECT MAX(bookID) AS highestBookID FROM Books`;
        const query2 = `SELECT MAX(publisherID) AS highestPublisherID FROM Publishers`;
        const query3 = `SELECT MAX(authorID) AS highestAuthorID FROM Authors`;
        let BOOKID = await connection.execute(query1);
        let PUBLISHERID = await connection.execute(query2);
        let AUTHORID = await connection.execute(query3);
        let bookId = BOOKID.rows[0][0] + 1;
        let publisherID = PUBLISHERID.rows[0][0] + 1;
        let authorID = AUTHORID.rows[0][0] + 1;
        const bindParams4 = {
            AuthorID: { val: authorID, type: oracledb.NUMBER },
            Author: { val: author, type: oracledb.STRING }
        };
        const bindParams5 = {
            PublisherID: { val: publisherID, type: oracledb.NUMBER },
            Publisher: { val: publisher, type: oracledb.STRING }
        };
        const bindParams6 = {
            BookID: { val: bookId, type: oracledb.NUMBER },
            Title: { val: title, type: oracledb.STRING },
            Year: { val: year, type: oracledb.NUMBER },
            AuthorId: { val: authorID, type: oracledb.NUMBER },
            Price: { val: price, type: oracledb.NUMBER },
            PublisherId: { val: publisherID, type: oracledb.NUMBER },
        };
        const bindParams7 = {
            UserId: { val: userID, type: oracledb.NUMBER },
            BookId: { val: bookId, type: oracledb.NUMBER },
            Discount: { val: discount, type: oracledb.NUMBER }
        };
        const query4 = `INSERT INTO Authors (authorID, authorName)
                        VALUES (:AuthorID, :Author)`;
        const query5 = `INSERT INTO Publishers (publisherID, publisherName)
                        VALUES (:PublisherID, :Publisher)`;
        const query6 = `INSERT INTO Books (bookID, title, publicationYear, authorID, price, publisherID)
                        VALUES (:BookID, :Title, :Year, :AuthorId, :Price, :PublisherId)`;
        const query7 = `INSERT INTO Sells (sellerID, bookID, discount)
                        VALUES (:UserId,:BookId,:Discount)`;
        // console.log(query4);
        const result4 = await connection.execute(query4, bindParams4, { autoCommit: true });
        const result5 = await connection.execute(query5, bindParams5, { autoCommit: true });
        const result6 = await connection.execute(query6, bindParams6, { autoCommit: true });
        const result7 = await connection.execute(query7, bindParams7, { autoCommit: true });
        connection.release();
        // console.log('Retrieved data:', result.rows);
        res.render('add', {
            decide: decide,
        });
    } catch (err) {
        res.send(err.message);
    }
})
//############################################################
//            AddCart
//############################################################
app.post('/addCart', async (req, res) => {
    try {
        const userID = req.session.user.userID;
        const title = req.body.title;
        const sellerID = parseInt(req.body.userID);
        // const iterator = req.body.iterator;

        const bindParams0 = {
            Title: { val: title, type: oracledb.STRING },
        }
        const query0 = `SELECT BOOKID FROM BOOKS WHERE TITLE=:Title`;
        const result0 = await runQuery(query0, bindParams0);

        const bindParams = {
            buyerID: userID,
            bookID: result0[0][0],
            sellerID: sellerID,
        }
        const query = `INSERT INTO CART (BUYERID, BOOKID, SELLERID)
                       VALUES (:buyerID, :bookID, :sellerID)`;
        await runQuery(query, bindParams);

        res.json({ success: true, message: 'Book added successfully' });
    } catch (err) {
        console.log(err);
        res.json({ success: false, message: 'Failed to add the book' });
    }
});


app.post('/removeFromCart', async (req, res) => {
    try {
        const bookID = req.body.bookID;
        const sellerID = req.body.sellerID;
        const userID = req.session.user.userID;

        const bindParams = {
            buyerID: userID,
            bookID: bookID,
            sellerID: sellerID
        };

        const query = `DELETE FROM CART WHERE BUYERID = :buyerID AND BOOKID = :bookID AND SELLERID= :sellerID`;
        await runQuery(query, bindParams);

        res.json({ success: true, message: 'Book removed successfully' });

    } catch (err) {
        console.log(err);
        res.json({ success: false, message: 'Failed to remove the book' });
    }
});



//############################################################
//            Cart
//############################################################
app.get('/cart', async (req, res) => {
    try {

        const userID = req.session.user.userID;
        const connection = await connectionPool.getConnection();
        const bindParams = {
            UserID: { val: userID, type: oracledb.NUMBER },
        };
        query = `
        SELECT 
        C.BOOKID AS BOOK_ID,
        C.SELLERID AS SELLER_ID,  -- Adding SELLERID to the results
        (SELECT B.TITLE FROM BOOKS B WHERE B.BOOKID = C.BOOKID) AS BOOK_NAME,
        (SELECT A.AUTHORNAME FROM AUTHORS A WHERE A.AUTHORID = 
        (SELECT B.AUTHORID FROM BOOKS B WHERE B.BOOKID = C.BOOKID)) AS AUTHOR_NAME,
        (SELECT P.PUBLISHERNAME FROM PUBLISHERS P WHERE P.PUBLISHERID = 
        (SELECT B.PUBLISHERID FROM BOOKS B WHERE B.BOOKID = C.BOOKID)) AS PUBLISHER_NAME,
        (SELECT B.PRICE FROM BOOKS B WHERE B.BOOKID = C.BOOKID) AS PRICE,
        (SELECT S.DISCOUNT FROM SELLS S WHERE S.BOOKID = C.BOOKID AND S.SELLERID 
        = C.SELLERID) AS DISCOUNT,
        (SELECT U.FIRSTNAME ||' '|| U.LASTNAME FROM USERS U WHERE U.USERID = C.SELLERID) 
        AS SELLER_FULL_NAME
        FROM CART C WHERE BUYERID=:UserID
        `;

        const result = await connection.execute(query, bindParams);
        console.log(result.rows)
        res.render('cart', {
            books: result.rows,
        });
    } catch (error) {
        console.log('hoi nai')

    }

});







//############################################################
//             Sales
//############################################################

app.get('/sales', async (req, res) => {
    try {
        decide = 1;
        const userID = req.session.user.userID;

        const bindParams = {
            UserId: { val: userID, type: oracledb.NUMBER }
        };

        const query1 = `SELECT b.title AS book_title, a.authorName AS author_name,
                             p.publisherName AS publisher, b.publicationYear AS publication_year,
                             b.price AS price, (s.discount*100) AS discount, b.MEDIUMIMAGEURL
                        FROM Sells s
                        JOIN Books b ON s.bookID = b.bookID
                        JOIN Authors a ON b.authorID = a.authorID
                        JOIN Publishers p ON b.publisherID = p.publisherID
                        WHERE s.sellerID = :UserId`;

        const query2 = `SELECT B.title AS book_title, A.authorName AS author_name,
                             P.publisherName AS publisher, B.publicationYear AS publication_year,
                             U_buyer.firstName || ' ' || U_buyer.lastName AS buyer_name,
                             L.district || ', ' || L.division AS location_name,
                             O.price, B.MEDIUMIMAGEURL as image
                        FROM Orders O
                        JOIN Books B ON O.bookID = B.bookID
                        JOIN Authors A ON B.authorID = A.authorID
                        JOIN Publishers P ON B.publisherID = P.publisherID
                        JOIN Users U_buyer ON O.buyerID = U_buyer.userID
                        LEFT JOIN Locations L ON O.locationID = L.locationID
                        WHERE O.sellerID = :UserId`;

        const query3 = `SELECT B.title AS book_title, A.authorName AS author_name,
                             P.publisherName AS publisher, B.publicationYear AS publication_year,
                             U_seller.firstName || ' ' || U_seller.lastName AS seller_name,
                             O.price, B.MEDIUMIMAGEURL as image
                        FROM Orders O
                        JOIN Users U_buyer ON O.buyerID = U_buyer.userID
                        JOIN Users U_seller ON O.sellerID = U_seller.userID
                        JOIN Books B ON O.bookID = B.bookID
                        JOIN Authors A ON B.authorID = A.authorID
                        JOIN Publishers P ON B.publisherID = P.publisherID
                        WHERE O.buyerID = :UserId`;

        const result1 = await runQuery(query1, bindParams);
        const result2 = await runQuery(query2, bindParams);
        const result3 = await runQuery(query3, bindParams);

        res.render('sales', {
            object: result1,
            object1: result2,
            object2: result3,
            decide: decide,
        });
    } catch (err) {
        res.send(err.message);
    }
});

app.post('/sales', async (req, res) => {
    try {
        decide = 1;
        const userID = req.session.user.userID;

        const bookName = req.body.remove;
        console.log(bookName);

        const bindParams1 = {
            Title: { val: bookName, type: oracledb.STRING },
            UserId: { val: userID, type: oracledb.NUMBER }
        };

        const bindParams = {
            UserId: { val: userID, type: oracledb.NUMBER }
        };

        const query0 = `DELETE FROM Sells WHERE
                        sellerID = :UserId
                        AND bookID IN 
                        (SELECT bookID FROM Books 
                         WHERE title= :Title)`;

        const query1 = `SELECT b.title AS book_title, a.authorName AS author_name,
                             p.publisherName AS publisher, b.publicationYear AS publication_year,
                             b.price AS price, (s.discount*100) AS discount, b.MEDIUMIMAGEURL
                        FROM Sells s
                        JOIN Books b ON s.bookID = b.bookID
                        JOIN Authors a ON b.authorID = a.authorID
                        JOIN Publishers p ON b.publisherID = p.publisherID
                        WHERE s.sellerID = :UserId`;

        const query2 = `SELECT B.title AS book_title, A.authorName AS author_name,
                             P.publisherName AS publisher, B.publicationYear AS publication_year,
                             U_buyer.firstName || ' ' || U_buyer.lastName AS buyer_name,
                             L.district || ', ' || L.division AS location_name,
                             O.price, B.MEDIUMIMAGEURL as image
                        FROM Orders O
                        JOIN Books B ON O.bookID = B.bookID
                        JOIN Authors A ON B.authorID = A.authorID
                        JOIN Publishers P ON B.publisherID = P.publisherID
                        JOIN Users U_buyer ON O.buyerID = U_buyer.userID
                        LEFT JOIN Locations L ON O.locationID = L.locationID
                        WHERE O.sellerID = :UserId`;

        const query3 = `SELECT B.title AS book_title, A.authorName AS author_name,
                             P.publisherName AS publisher, B.publicationYear AS publication_year,
                             U_seller.firstName || ' ' || U_seller.lastName AS seller_name,
                             O.price, B.MEDIUMIMAGEURL as image
                        FROM Orders O
                        JOIN Users U_buyer ON O.buyerID = U_buyer.userID
                        JOIN Users U_seller ON O.sellerID = U_seller.userID
                        JOIN Books B ON O.bookID = B.bookID
                        JOIN Authors A ON B.authorID = A.authorID
                        JOIN Publishers P ON B.publisherID = P.publisherID
                        WHERE O.buyerID = :UserId`;

        await runQuery(query0, bindParams1, { autoCommit: true });
        const result1 = await runQuery(query1, bindParams);
        const result2 = await runQuery(query2, bindParams);
        const result3 = await runQuery(query3, bindParams);

        res.render('sales', {
            object: result1,
            object1: result2,
            object2: result3,
            decide: decide,
        });
    } catch (err) {
        res.send(err.message);
    }
});








//############################################################
//             CHAT
//############################################################

app.get('/chat', async (req, res) => {
    const userID = req.session.user.userID;
    // console.log('id  ' , userID)

    const query = `
          SELECT DISTINCT CASE 
                          WHEN senderID = :userID THEN receiverID 
                          ELSE senderID END AS interactionID 
          FROM Messages 
          WHERE senderID = :userID OR receiverID = :userID
      `;
    const bindParams = {
        userID: userID,
    };

    const queryData = await runQuery(query, bindParams);

    // console.log('server chat ee query ', queryData)

    res.render('chat', {
        userID: userID,
        queryData: queryData,
        includeChatClient: true // or false
    })
});


app.post("/chatList", async (req, res) => {
    try {
        const { user1ID, user2ID } = req.body;
        console.log('s ee users: ', user1ID, ' -> ', user2ID)
        const query = `
        SELECT * 
        FROM Messages 
        WHERE (senderID = :user1ID AND receiverID = :user2ID) 
           OR (senderID = :user2ID AND receiverID = :user1ID) 
        ORDER BY messageTime ASC
    `;
        const bindParams = {
            user1ID: user1ID,
            user2ID: user2ID,

        };

        const queryData = await runQuery(query, bindParams);
        console.log(' chat list query ', queryData)

        res.json(queryData);
    } catch (error) {
        console.error("Error fetching interactions:", error);
        res.status(500).json({ error: "Error fetching interactions" });
    }
});



async function generateMessageID() {
    const getMaxMessageIDQuery = `
        SELECT MAX(messageID) AS maxMessageID FROM MESSAGES
    `;

    try {
        const result = await runQuery(getMaxMessageIDQuery, []);
        console.log(result);

        if (!result || !result.rows || result.rows.length === 0) {
            throw new Error("Unexpected database result");
        }

        const maxMessageID = result.rows[0][0] || 0;
        const newMessageID = maxMessageID + 1;

        return newMessageID;
    } catch (error) {
        console.error("Error generating message ID:", error);
        throw error;  // or return some default/fallback value
    }
}
//############################################################


///








//############################################################
//                       Server 
//############################################################


const server = require('http').createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    },
});


//############################################################
//                      Socket IO
//############################################################


io.on("connection", (socket) => {


    console.log(`User Connected: ${socket.id}`);


    socket.on("join_room", (data) => {
        socket.join(data);
        console.log(`server ee: User with ID: ${socket.id} joined room: ${data}`);
    });

    socket.on('send_message', async (data) => {
       

        const { senderID, receiverID, messageText } = data;
        console.log('se socket ', senderID, ' ', receiverID, ' ', messageText)
        

        const insertMessageQuery = `
            INSERT INTO messages (senderID, receiverID, messageText, messageTime, isRead)
            VALUES (:senderID, :receiverID, :messageText, SYSTIMESTAMP, :isRead)
        `;

        const bindParams = {
            senderID: senderID,
            receiverID: receiverID,
            messageText: messageText,
            isRead: 0, // You can set the appropriate value for isRead
        };


        try {
            await runQuery(insertMessageQuery, bindParams);
            socket.to(data.roomName).emit("receive_message", data);
        } catch (error) {
            console.error('There was an error inserting the data:', error.message);
        }

    });

    socket.on("disconnect", () => {
        console.log("User Disconnected", socket.id);
    });
});

const port = process.env.port || 3000
server.listen(port, () => {
    console.log(`server running on port ${port}`);
});



