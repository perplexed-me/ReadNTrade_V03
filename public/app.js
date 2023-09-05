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
  

  try {
    const response = await axios.post('/login', data);
  
    //name from response
    userID = response.data[0][0]
    userName = response.data[0][4] +' '+ response.data[0][5]
    // console.log(userID+' '+userName)
    
    if (response.data && response.status === 200) { 
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
//              login clientSide
//############################################################


//############################################################
//              login clientSide
//############################################################




//############################################################
//              login clientSide
//############################################################



