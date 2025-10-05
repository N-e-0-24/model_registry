import bcrypt from 'bcryptjs';
import { createUser, findUserByEmail } from '../model/userModel.js';
import { generateToken } from '../utils/generateToken.js';

export const registerUser = async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    const existingUser = await findUserByEmail(email);
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const newUser = await createUser(fullName, email, password);
    res.json({
      id: newUser.id,
      email: newUser.email,
      token: generateToken(newUser.id)
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await findUserByEmail(email);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    res.json({
      id: user.id,
      email: user.email,
      token: generateToken(user.id)
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
