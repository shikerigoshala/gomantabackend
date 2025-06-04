import { supabase } from './supabase';
import { toast } from 'react-hot-toast';
import { generateRandomPassword } from '../utils/helpers';

// User roles
export const USER_ROLES = {
  DEFAULT: 'default',
  FAMILY_HEAD: 'family_head',
  FAMILY_MEMBER: 'family_member'
};

/**
 * Register a new user with the specified role
 * @param {Object} userData - User data including email, password, name, etc.
 * @param {string} role - User role (default, family_head, family_member)
 * @param {string} [familyHeadId] - Required for family members
 * @returns {Promise<Object>} - User data or error
 */
export const registerUser = async (userData, role = USER_ROLES.DEFAULT, familyHeadId = null) => {
  try {
    // Prepare user metadata
    const userMetadata = {
      name: userData.name,
      first_name: userData.firstName || userData.name.split(' ')[0],
      last_name: userData.lastName || userData.name.split(' ').slice(1).join(' '),
      phone: userData.phone || '',
      user_type: role,
      ...(familyHeadId && { family_head_id: familyHeadId })
    };

    // Create user in Supabase Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: userMetadata,
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (signUpError) {
      throw signUpError;
    }

    // For email confirmation
    if (authData.user && !authData.user.identities?.length) {
      throw new Error('A user with this email already exists');
    }

    return {
      success: true,
      user: authData.user,
      message: 'Registration successful! Please check your email to verify your account.'
    };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      error: error.message || 'Failed to register user'
    };
  }
};

/**
 * Invite a family member to join the family group
 * @param {string} familyHeadId - ID of the family head
 * @param {Object} memberData - Member data including name, email, relationship
 * @returns {Promise<Object>} - Result of the invitation
 */
export const inviteFamilyMember = async (familyHeadId, memberData) => {
  try {
    // Verify that the inviter is a family head
    const { data: familyHead, error: headError } = await supabase
      .from('users')
      .select('id, family_id, role')
      .eq('id', familyHeadId)
      .single();

    if (headError || !familyHead || familyHead.role !== USER_ROLES.FAMILY_HEAD) {
      throw new Error('Only family heads can invite members');
    }

    // Generate a secure random password
    const password = generateRandomPassword(12);

    // Register the family member
    const { user, error: signUpError } = await registerUser(
      {
        ...memberData,
        password,
      },
      USER_ROLES.FAMILY_MEMBER,
      familyHeadId
    );

    if (signUpError) {
      throw signUpError;
    }

    // Send welcome email with credentials
    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: memberData.email,
        subject: `Welcome to ${familyHead.name}'s Family Group`,
        template: 'family-member-invite',
        data: {
          name: memberData.name,
          family_head_name: familyHead.name,
          email: memberData.email,
          password: password,
          login_url: `${window.location.origin}/login`,
        },
      },
    });

    if (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Continue even if email fails
    }

    return {
      success: true,
      userId: user.id,
      message: 'Family member invited successfully!',
    };
  } catch (error) {
    console.error('Error inviting family member:', error);
    return {
      success: false,
      error: error.message || 'Failed to invite family member',
    };
  }
};

/**
 * Get the current user's role
 * @returns {Promise<string>} - User role
 */
export const getUserRole = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return data?.role || USER_ROLES.DEFAULT;
  } catch (error) {
    console.error('Error getting user role:', error);
    return USER_ROLES.DEFAULT;
  }
};

/**
 * Check if the current user is a family head
 * @returns {Promise<boolean>}
 */
export const isFamilyHead = async () => {
  const role = await getUserRole();
  return role === USER_ROLES.FAMILY_HEAD;
};

/**
 * Check if the current user is a family member
 * @returns {Promise<boolean>}
 */
export const isFamilyMember = async () => {
  const role = await getUserRole();
  return role === USER_ROLES.FAMILY_MEMBER;
};

/**
 * Get all family members for the current user
 * @param {string} userId - ID of the family head
 * @returns {Promise<Array>} - List of family members
 */
export const getFamilyMembers = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`family_head_id.eq.${userId},and(id.eq.${userId},role.eq.${USER_ROLES.FAMILY_HEAD})`)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching family members:', error);
    return [];
  }
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated user data
 */
export const updateUserProfile = async (userId, updates) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Remove a family member
 * @param {string} familyHeadId - ID of the family head
 * @param {string} memberId - ID of the member to remove
 * @returns {Promise<Object>} - Result of the operation
 */
export const removeFamilyMember = async (familyHeadId, memberId) => {
  try {
    // Verify that the remover is the family head
    const { data: familyHead, error: headError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', familyHeadId)
      .single();

    if (headError || !familyHead || familyHead.role !== USER_ROLES.FAMILY_HEAD) {
      throw new Error('Only family heads can remove members');
    }

    // Verify the member belongs to the family
    const { data: member, error: memberError } = await supabase
      .from('users')
      .select('id, family_head_id')
      .eq('id', memberId)
      .single();

    if (memberError || !member || member.family_head_id !== familyHeadId) {
      throw new Error('Invalid family member');
    }

    // Remove the family relationship (this will cascade to other tables)
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        family_id: null,
        family_head_id: null,
        role: USER_ROLES.DEFAULT 
      })
      .eq('id', memberId);

    if (updateError) throw updateError;

    return { success: true, message: 'Family member removed successfully' };
  } catch (error) {
    console.error('Error removing family member:', error);
    return { success: false, error: error.message };
  }
};

// Export auth functions for convenience
export const {
  signInWithPassword: login,
  signOut: logout,
  resetPasswordForEmail: sendPasswordReset,
  updateUser: updateAuthUser,
  getSession,
  onAuthStateChange,
} = supabase.auth;
