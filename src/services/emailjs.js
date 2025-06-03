import emailjs from '@emailjs/browser';

// Initialize EmailJS with your public key
emailjs.init("bQxSII_caD6vUHvur");

/**
 * Send an email with account credentials to a user
 * @param {Object} userData - User data including name and email
 * @param {string} password - Generated password for the user
 * @returns {Promise<Object>} - Result of the email sending operation
 */
export const sendAccountCreationEmail = async (userData, password) => {
  try {
    // Log the attempt to send email
    console.log('Attempting to send account creation email to:', userData.email);
    
    // Prepare the template parameters
    const templateParams = {
      to_name: userData.name || 'Valued Donor',
      to_email: userData.email,
      username: userData.email,
      password: password,
      site_name: "Shikeri Gaushala",
      login_url: window.location.origin + '/login',
      // Add current date for reference
      date: new Date().toLocaleDateString(),
    };

    console.log('Email template parameters prepared:', { ...templateParams, password: '******' });

    // Send the email using EmailJS
    const result = await emailjs.send(
      "service_oypn6wo", // Service ID
      "template_sstt1yc", // Template ID - Using the specified template
      templateParams
    );

    console.log('Account creation email sent successfully:', result.status, result.text);
    
    // Also log the credentials to console for testing purposes
    console.log('ACCOUNT CREDENTIALS (for testing only):', {
      username: userData.email,
      password: password
    });
    
    return { success: true, result };
  } catch (error) {
    console.error('Error sending account creation email:', error);
    // Log the credentials to console even if email fails
    console.log('ACCOUNT CREDENTIALS (email failed, for testing only):', {
      username: userData.email,
      password: password
    });
    // Return success even if email fails to prevent donation process from failing
    return { success: true, error };
  }
};

/**
 * Send a donation confirmation email
 * @param {Object} donationData - Donation data
 * @returns {Promise<Object>} - Result of the email sending operation
 */
export const sendDonationConfirmationEmail = async (donationData) => {
  try {
    const templateParams = {
      to_name: donationData.donor_info?.name || 'Valued Donor',
      to_email: donationData.donor_info?.email,
      amount: donationData.amount,
      donation_id: donationData.id || 'N/A',
      date: new Date().toLocaleDateString(),
      donation_type: donationData.type || 'Donation',
    };

    const result = await emailjs.send(
      "service_oypn6wo", // Service ID
      "template_sstt1yc", // Template ID
      templateParams
    );

    console.log('Donation confirmation email sent successfully:', result.status);
    return { success: true, result };
  } catch (error) {
    console.error('Error sending donation confirmation email:', error);
    return { success: true, error };
  }
};

export default emailjs;
