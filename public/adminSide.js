document.getElementById("adminLoginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
  
    const formData = new FormData(e.target);
  
    const data = {
      email: formData.get('email'),
      password: formData.get('password')
    };
    
  
    try {
      const response = await axios.post('/admin', data);
      console.log('a   --> ',response)
    
      //name from response
     
      // console.log(userID+' '+userName)
      
      if (response.data && response.status === 200) { 
        // userID = response.data[0][0]
        // userName = response.data[0][4] +' '+ response.data[0][5]
        window.location.href = '/adminReport';
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
  
  