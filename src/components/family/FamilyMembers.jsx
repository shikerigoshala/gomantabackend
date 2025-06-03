import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { inviteFamilyMember, getFamilyMembers, removeFamilyMember } from '../../services/authService';
import { toast } from 'react-hot-toast';
import { generateRandomPassword } from '../../utils/helpers';

const FamilyMembers = () => {
  const { user, isFamilyHead } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    relationship: 'Family Member'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch family members when component mounts or user changes
  useEffect(() => {
    const fetchFamilyMembers = async () => {
      if (!user?.id || !isFamilyHead()) return;
      
      try {
        setLoading(true);
        const familyMembers = await getFamilyMembers(user.id);
        setMembers(familyMembers);
      } catch (error) {
        console.error('Error fetching family members:', error);
        toast.error('Failed to load family members');
      } finally {
        setLoading(false);
      }
    };

    fetchFamilyMembers();
  }, [user, isFamilyHead]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission for inviting a new family member
  const handleInviteMember = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { success, error } = await inviteFamilyMember(user.id, {
        ...formData,
        // Generate a random password for the new member
        password: generateRandomPassword(12)
      });

      if (success) {
        toast.success('Invitation sent successfully!');
        setShowInviteForm(false);
        setFormData({ name: '', email: '', relationship: 'Family Member' });
        
        // Refresh the members list
        const updatedMembers = await getFamilyMembers(user.id);
        setMembers(updatedMembers);
      } else {
        throw new Error(error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error inviting family member:', error);
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle removing a family member
  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this family member?')) {
      return;
    }

    try {
      const { success, error } = await removeFamilyMember(user.id, memberId);
      
      if (success) {
        toast.success('Family member removed successfully');
        // Refresh the members list
        const updatedMembers = await getFamilyMembers(user.id);
        setMembers(updatedMembers);
      } else {
        throw new Error(error || 'Failed to remove family member');
      }
    } catch (error) {
      console.error('Error removing family member:', error);
      toast.error(error.message || 'Failed to remove family member');
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Family Members</h2>
        {isFamilyHead() && (
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {showInviteForm ? 'Cancel' : '+ Invite Family Member'}
          </button>
        )}
      </div>

      {/* Invite Family Member Form */}
      {showInviteForm && isFamilyHead() && (
        <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Invite a Family Member</h3>
          <form onSubmit={handleInviteMember}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <div className="mb-4">
              <label htmlFor="relationship" className="block text-sm font-medium text-gray-700 mb-1">
                Relationship
              </label>
              <select
                id="relationship"
                name="relationship"
                value={formData.relationship}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Spouse">Spouse</option>
                <option value="Child">Child</option>
                <option value="Parent">Parent</option>
                <option value="Sibling">Sibling</option>
                <option value="Other Family Member">Other Family Member</option>
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Family Members List */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              {isFamilyHead() && (
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {members.length === 0 ? (
              <tr>
                <td colSpan={isFamilyHead() ? 5 : 4} className="px-6 py-4 text-center text-sm text-gray-500">
                  No family members found. {isFamilyHead() && 'Invite your family members to get started.'}
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{member.name || 'No name'}</div>
                        {member.relationship && (
                          <div className="text-sm text-gray-500">{member.relationship}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      member.role === 'family_head' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {member.role === 'family_head' ? 'Family Head' : 'Family Member'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.last_sign_in_at ? 'Active' : 'Invitation Pending'}
                  </td>
                  {isFamilyHead() && member.role !== 'family_head' && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Remove from family"
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FamilyMembers;
