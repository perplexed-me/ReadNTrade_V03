//############################################################
//              CientSide
//############################################################

let userID;
let userName;


//############################################################
//              login 
//############################################################


document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);

  const data = {
    email: formData.get('email'),
    password: formData.get('password')
  };
  // console.log(data)

  try {
    const response = await axios.post('/login', data);
  
   console.log(response.data,'    ',response.status)
    
    if (response.data && response.status === 200) { 
       //name from response
      userID = response.data[0][0]
      userName = response.data[0][4] +' '+ response.data[0][5]
    // console.log(userID+' '+userName)
      window.location.href = '/home';
    }
    else {
      document.body.classList.add("jerk-page");

      // remove the jerk-page class after 0.5 seconds to revert the effect.
      setTimeout(() => {
        document.body.classList.remove("jerk-page");
      }, 500);
  }

  }
  catch (error) {
    console.error('Error during login:', error);
    alert('An error occurred during login.');
  }
});



//############################################################
//               sign up 
//############################################################




document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = {
    username: formData.get('username'),
    email: formData.get('email'),
    password: formData.get('password')
  };
  // console.log(data)


  try {
    const response = await axios.post('/signup',data)

    if (response.data && response.status === 200){
       window.location.href = '/index';

    } else {
      alert('Sign up failed! Please try again.');
    }
  } catch (error) {
    console.error('Error during sign up:', error);
    alert('An error occurred during sign up.');
  }
});

//############################################################
//              User Report
//############################################################

function reportUser() {
  const accusedID = document.getElementById('accusedID').value;
  const cause = document.getElementById('cause').value;
  const notification = document.getElementById('notification');

  fetch('/report', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({
          adminID: 1,
          accusedID: accusedID,
          reporterID: 242,
          cause: cause
      })
  })
      .then(response => {
          // Check if the response is successful
          if (!response.ok) {
              // If not, get the error message from the response and throw it
              return response.json().then(err => { throw err; });
          }
          return response.json();
      })
      .then(data => {
          notification.textContent = data.message;
          notification.style.color = 'green'; // Display message in green color
      })
      .catch(error => {
          if (error && error.error === 'Already reported') {
              notification.textContent = 'You have already reported this user.';
          } else if (error && error.error === 'Invalid accusedID') {
              notification.textContent = 'The accused user ID is invalid.';
          } else {
              notification.textContent = 'Error reporting the user.';
          }
          notification.style.color = 'red'; // Display error messages in red color
      });
}


//############################################################
//              login Admin
//############################################################




//############################################################
//              login clientSide
//############################################################



