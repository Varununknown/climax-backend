const mongoose = require('mongoose');
const Payment = require('./models/Payment.cjs');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/climax-ott')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

async function checkPaymentInDB() {
  const userId = '68939992d88babbd48303195';
  const contentId = '6893918c648a3c2250ddad1b';
  
  console.log('🔍 Checking payments in database...');
  console.log('Looking for:', { userId, contentId });
  
  try {
    // Convert to ObjectIds
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const contentIdObj = new mongoose.Types.ObjectId(contentId);
    
    console.log('ObjectIds:', { userIdObj, contentIdObj });
    
    // Check for any payment with these IDs
    const anyPayment = await Payment.findOne({ 
      userId: userIdObj,
      contentId: contentIdObj
    });
    
    if (anyPayment) {
      console.log('✅ Payment found:');
      console.log({
        _id: anyPayment._id,
        userId: anyPayment.userId,
        contentId: anyPayment.contentId,
        status: anyPayment.status,
        transactionId: anyPayment.transactionId,
        amount: anyPayment.amount,
        createdAt: anyPayment.createdAt
      });
      
      if (anyPayment.status === 'approved') {
        console.log('✅ Payment is APPROVED - should show premium badge');
      } else {
        console.log('⚠️ Payment status is:', anyPayment.status, '- NOT approved');
      }
    } else {
      console.log('❌ No payment found for this user-content combination');
      
      // Check all payments for this user
      const userPayments = await Payment.find({ userId: userIdObj });
      console.log(`Found ${userPayments.length} payments for this user:`);
      userPayments.forEach(p => {
        console.log(`- Content: ${p.contentId}, Status: ${p.status}, Transaction: ${p.transactionId}`);
      });
      
      // Check all payments for this content
      const contentPayments = await Payment.find({ contentId: contentIdObj });
      console.log(`Found ${contentPayments.length} payments for this content:`);
      contentPayments.forEach(p => {
        console.log(`- User: ${p.userId}, Status: ${p.status}, Transaction: ${p.transactionId}`);
      });
    }
    
  } catch (err) {
    console.error('❌ Error:', err);
  }
  
  process.exit(0);
}

checkPaymentInDB();