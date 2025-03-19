

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} 


from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  startAt,
  endAt,
  query,
  where,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  increment,
  arrayUnion,
  getDoc,
  arrayRemove,
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDvOLsG6Sk5PFuyGSh5aFFsHNLc9vqa8EE",
  authDomain: "test-96524.firebaseapp.com",
  projectId: "test-96524",
  storageBucket: "test-96524.firebasestorage.app",
  messagingSenderId: "571466546618",
  appId: "1:571466546618:web:c9e2648747c9acc721f183",
  measurementId: "G-HQBBZPM7LD",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let selectedCustomer = null;

// مصادقة المستخدم
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    showDashboard();
    loadCustomers();
  } else {
    showAuthSection();
    
  }
});

window.login = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert('تم تسجيل الدخول بنجاح')

  } catch (error) {
    alert("خطأ في تسجيل الدخول: " + error.message);
  }
};


    // تسجيل جديد
    window.register = async () => {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      try {
          await createUserWithEmailAndPassword(auth, email, password);
      } catch (error) {
          alert('خطأ في التسجيل: ' + error.message);
      }
  };




// تسجيل الخروج
window.logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    alert('خطأ في تسجيل الخروج: ' + error.message);
  }
};



// إدارة الواجهة
function showDashboard() {
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('dashboard').style.display = 'grid';
}









function showAuthSection() {
  document.getElementById('authSection').style.display = 'block';
  document.getElementById('dashboard').style.display = 'none';
}


// إضافة زبون
window.addCustomer = async () => {
  // عرض نافذة SweetAlert2 تطلب من المستخدم إدخال اسم الزبون
  const { value: name } = await Swal.fire({
    title: 'يرجى إدخال اسم الزبون',
    input: 'text',
    inputLabel: 'اسم الزبون',
    inputPlaceholder: 'أدخل اسم الزبون',
    showCancelButton: true,
    cancelButtonText: 'إلغاء',
    confirmButtonText: 'إضافة',
    inputValidator: (value) => {
      if (!value) {
        return 'يرجى إدخال اسم الزبون!';
      }
    },
    // إضافة z-index لتحديد ترتيب الظهور
    customClass: {
      popup: 'swal-popup'
    }
  });

  // التحقق إذا تم إدخال اسم الزبون
  if (!name) {
    Swal.fire('لم يتم إدخال اسم الزبون');
    return;
  }

  try {
    // إضافة الزبون إلى قاعدة البيانات
    await addDoc(collection(db, "stores", currentUser.uid, "customers"), {
      name: name,
      balance: 0,
      transactions: [],
      lastUsed: Date.now() // إضافة توقيت آخر استخدام
    });

    // إغلاق نافذة الإضافة
    closeAddCustomerModal();

    // إعادة تحميل قائمة الزبائن
    loadCustomers();

    // إظهار رسالة نجاح باستخدام SweetAlert2
    Swal.fire('تم إضافة الزبون بنجاح', '', 'success');
  } catch (error) {
    // في حالة حدوث خطأ
    Swal.fire('خطأ في إضافة الزبون: ' + error.message, '', 'error');
  }
};

// إضافة style لتحكم في الـ z-index الخاص بـ SweetAlert2
const style = document.createElement('style');
style.innerHTML = `
  .swal-popup {
    z-index: 999 !important;
  }
`;
document.head.appendChild(style);



//////////////////////////////






window.loadCustomers = async () => {

  // 1. تغيير ترتيب الاستعلام حسب lastUsed تنازليًا
  const q = query(
    collection(db, "stores", currentUser.uid, "customers"),
    orderBy("lastUsed", "desc") // الترتيب حسب آخر استخدام
  );

  const querySnapshot = await getDocs(q);
  const customers = [];

  querySnapshot.forEach(doc => {
    const data = doc.data();
    customers.push({ id: doc.id, ...data });
  });

  // 2. إزالة الفرز اليدوي (لم يعد ضروريًا)
  
  // 3. تحديث واجهة المستخدم
  const list = document.getElementById('customersList');
  list.innerHTML = '';

  customers.forEach(data => {
    const li = document.createElement('li');
    li.className = 'customer-item';
    li.innerHTML = `
      <div>
        <h4>${data.name}</h4>
        
        <p style="color: ${ data.balance >= 0 ? 'var(--dark)' : 'var(--danger)'}">
          ${data.balance} ليرة
        </p>
      </div>
      <button class="btn1" onclick="deleteCustomer('${data.id}')">
        <i class="fas fa-trash"></i>
      </button>
    `;
    
    // 4. تحديث lastUsed عند النقر
    li.onclick = async () => {
      // تحديث التاريخ في قاعدة البيانات
      await updateDoc(doc(db, "stores", currentUser.uid, "customers", data.id), {
        lastUsed: new Date()
      });
      
      showCustomerDetails(data.id, data);
      
      // إعادة تحميل القائمة لتحديث الترتيب
      loadCustomers();
    };
    
    list.appendChild(li);
  });
};











//عدد الزبائن
document.addEventListener('DOMContentLoaded', () => {
  const targetNode = document.getElementById('customersList');
  if (!targetNode) return;  // التأكد من وجود العنصر

  const config = { childList: true, subtree: true };

  const observer = new MutationObserver(() => {
    document.getElementById('counter').textContent = document.querySelectorAll('#customersList li').length;
  });

  // بدء المراقبة
  observer.observe(targetNode, config);
});





//////////////////////////////////////
//اجمالي الديون
// إنشاء الكود داخل setTimeout لتحديث الحساب بعد 3 ثواني
setTimeout(() => {
  const h4Elements = document.querySelectorAll('#customersList li p');
  let totalValue = 0;

  // حساب مجموع القيم داخل p
  h4Elements.forEach(p => {
    totalValue += parseFloat(p.textContent) || 0;  // جمع القيم داخل p (تجاهل العناصر غير الرقمية)
  });

  // عرض النتيجة في العنصر counter2
  document.getElementById('counter2').textContent = totalValue;
}, 0);

// مراقبة التغيرات داخل قائمة li
const targetNode = document.getElementById('customersList');
const config = { childList: true, subtree: true, characterData: true };

// إنشاء observer لمراقبة التغيرات
const observer = new MutationObserver(() => {
  const h4Elements = document.querySelectorAll('#customersList li p');
  let totalValue = 0;

  // حساب مجموع القيم داخل p
  h4Elements.forEach(p => {
    totalValue += parseFloat(p.textContent) || 0;  // جمع القيم داخل p
  });

  // عرض النتيجة في العنصر counter2
  document.getElementById('counter2').textContent = totalValue;
});

// بدء المراقبة
observer.observe(targetNode, config);
//////////////////////////////////////////////



















  // حذف زبون
  window.deleteCustomer = async (customerId) => {
    // الخطوة الأولى: تأكيد الحذف برسالة تحذيرية
    const confirmDelete = await Swal.fire({
      title: 'هل تريد حذف العميل؟',
      html: `
         <div style="display: flex; justify-content: center; align-items: center;">
                <lottie-player 
                    src="https://lottie.host/c8791956-98a4-490f-a9e1-b28d0fe18e12/u4QKY0nES6.json"
                    background="transparent"
                    speed="1"
                    style="width: 150px; height: 150px;"
                    loop
                    autoplay>
                </lottie-player>
            </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    });
    
  
    if (!confirmDelete.isConfirmed) {
      Swal.fire('تم الإلغاء', 'لم يتم حذف الزبون', 'info');
      return;
    }
  
    // الخطوة الثانية: إدخال كلمة تأكيد
    const { value: confirmText } = await Swal.fire({
      title: 'تأكيد إضافي',
      input: 'text',
      inputLabel: 'اكتب "حذف" للتأكيد',
      inputPlaceholder: 'اكتب الكلمة هنا',
      showCancelButton: true,
      confirmButtonText: 'تأكيد',
      cancelButtonText: 'إلغاء',
      inputValidator: (value) => {
        if (value !== 'حذف') {
          return 'يجب كتابة كلمة "حذف" بشكل صحيح';
        }
      }
    });
  
    if (confirmText !== 'حذف') {
      Swal.fire('تم الإلغاء', 'لم يتم حذف الزبون', 'info');
      return;
    }
  
    // الخطوة الثالثة: تنفيذ عملية الحذف
    try {
      await deleteDoc(doc(db, "stores", currentUser.uid, "customers", customerId));
      loadCustomers();
      if (selectedCustomer === customerId) {
        closeCustomerDetails();
      }
      Swal.fire({
        title: 'تم حذف الزبون بنجاح',
        html: `
           <div style="display: flex; justify-content: center; align-items: center;">
                  <lottie-player 
                      src="https://lottie.host/dcbdd1b6-bd83-4d99-b7eb-49b1eb87dffb/VvU7vZezCw.json"
                      background="transparent"
                      speed="1"
                      style="width: 150px; height: 150px;"
                      autoplay>
                  </lottie-player>
              </div>
              
        `,
        confirmButtonText: 'تم',

      
      });



      
    } catch (error) {
      Swal.fire('خطأ', 'حدث خطأ أثناء الحذف: ' + error.message, 'error');
    }
  };




    // عرض تفاصيل الزبون
    async function showCustomerDetails(customerId, customerData) {
      selectedCustomer = customerId;
      document.getElementById('customerDetails').style.display = 'block';
      document.getElementById('selectedCustomerName').textContent = ('الأسم : ')+customerData.name;
      document.getElementById('balance').textContent = ("المجموع:")+customerData.balance ;
      
      loadTransactions(customerData.transactions);
      
  }






    // إضافة معاملة
// إضافة معاملة
window.addTransaction = async (type) => {
  const amount = parseFloat(document.getElementById('amountInput').value);
  if (isNaN(amount) || amount <= 0) {
    iziToast.warning({
      title: 'تحذير',
      message: 'ادخل مبلع صحيح'
    });

    return;
  }

  const customerRef = doc(db, "stores", currentUser.uid, "customers", selectedCustomer);
  const transaction = {
      type: type,
      amount: amount,
      date: new Date().toISOString()
  };

  try {
    // عرض رسالة الإشعار بناءً على نوع المعاملة
    const message = type === 'credit' 
      ? `تم إضافة: ${amount} ليرة` // إذا كانت إضافة دين
      : `تم خصم: ${amount} ليرة`; // إذا كانت خصم دين

    iziToast.info({
      title: type === 'credit' ? 'تم الإضافة' : 'تم الخصم',
      message: message
    });

    await updateDoc(customerRef, {
        balance: increment(type === 'credit' ? amount : -amount),
        transactions: arrayUnion(transaction)
    });

    document.getElementById('amountInput').value = ''; // إفراغ الـ input بعد المعاملة

    // تحديث الرصيد بعد جلب البيانات
    const customerSnap = await getDoc(customerRef);
    const customerData = customerSnap.data();

    document.getElementById('balance').textContent = ("المجموع:")+customerData.balance ;

    loadCustomers();
    loadTransactions(customerData.transactions);
  } catch (error) {
    alert('خطأ في إضافة المعاملة: ' + error.message);
  }
};







  // حذف جميع المعاملات
  window.deleteALLTransaction = async () => {
    const confirmation = await  Swal.fire({
      title: "هل انت متاكد من حذف جميع المعاملات ?",
      html: `
         <div style="display: flex; justify-content: center; align-items: center;">
                <lottie-player 
                    src="https://lottie.host/1eccb12a-f220-45e3-b382-76255c2e7e82/34O2VeUpdt.json"
                    background="transparent"
                    speed="1"
                    loop
                    style="width: 150px; height: 150px;"
                    autoplay>
                </lottie-player>
            </div>
            
      `,
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    });
  
    if (!confirmation.isConfirmed) {
      Swal.fire('تم الإلغاء', 'لم يتم حذف المعاملات', 'info');
      return;
    }
  
    const { value: userInput } = await Swal.fire({
      title: 'اكتب "حذف" للتأكيد',
      input: 'text',
      inputPlaceholder: 'اكتب حذف هنا',
      confirmButtonText: 'نعم',
      cancelButtonText: 'إلغاء',


      showCancelButton: true 
    });
  
    if (userInput !== 'حذف') {
      Swal.fire('إلغاء', 'الكلمة المدخلة غير صحيحة', 'error');
      return;
    }
  
    const customerRef = doc(db, "stores", currentUser.uid, "customers", selectedCustomer);
  
    try {
      const customerSnap = await getDoc(customerRef);
      const customerData = customerSnap.data();
  
      if (!customerData || !customerData.transactions || customerData.transactions.length === 0) {
        Swal.fire('لا توجد معاملات', 'لا توجد معاملات لهذا الزبون', 'info');
        return;
      }
  
      // تحديث الرصيد ليكون صفر وحذف المعاملات
      await updateDoc(customerRef, {
        balance: 0,
        transactions: []
      });
  
      document.getElementById('balance').textContent = 0;
      loadCustomers();
      loadTransactions([]);
  
      Swal.fire({
        title: "تم حذف جميع المعاملات بنجاح ",
        html: `
           <div style="display: flex; justify-content: center; align-items: center;">
                  <lottie-player 
                      src="https://lottie.host/16fcf0a4-7fd0-4534-9b1b-34e532d42281/yIAr0oWkuR.json"
                      background="transparent"
                      speed="1"
                      style="width: 150px; height: 150px;"
                      autoplay>
                  </lottie-player>
              </div>
              
        `,
        confirmButtonText: "تم",
      });
    } catch (error) {
      Swal.fire('خطأ', 'حدث خطأ أثناء الحذف: ' + error.message, 'error');
    }
  };
  
  
////////


  

  // تحميل المعاملات
  async function loadTransactions(transactions) {
      const list = document.getElementById('transactionsList');
      list.innerHTML = '';
      
      transactions.reverse().forEach((transaction, index) => {
          const li = document.createElement('li');
          li.className = 'transaction-item';
          li.innerHTML = `
              <div>
                  <span style="color: ${transaction.type === 'credit' ? 'var(--dark)' : 'var(--danger)'}">
                      ${transaction.type === 'credit' ? '+' : '-'}${transaction.amount} ليرة
                  </span>
                  <small>${new Date(transaction.date).toLocaleDateString('en')}</small>
              </div>
              <div>
                  <button class="btn1 btn-danger" onclick="deleteTransaction(${index})">
                      <i class="fas fa-trash"></i>
                  </button>
              </div>
          `;
          list.appendChild(li);
      });
  }






  // حذف معاملة
  window.deleteTransaction = async (index) => {
    const confirmDelete = await Swal.fire({
      title: 'تأكيد الحذف',
      text: 'هل تريد حذف هذه المعاملة؟',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    });
  
    if (!confirmDelete.isConfirmed) {
      Swal.fire('تم الإلغاء', 'لم يتم حذف المعاملة', 'info');
      return;
    }
  
    const customerRef = doc(db, "stores", currentUser.uid, "customers", selectedCustomer);
    const customerSnap = await getDoc(customerRef);
    const transactions = customerSnap.data().transactions;
    const reversedIndex = transactions.length - 1 - index;
    const transaction = transactions[reversedIndex];
  
    try {
      // تحديث الرصيد بشكل عكسي بناءً على نوع المعاملة
      await updateDoc(customerRef, {
        balance: increment(transaction.type === 'credit' ? -transaction.amount : transaction.amount),
        transactions: arrayRemove(transaction)
      });
  
      loadTransactions((await getDoc(customerRef)).data().transactions);
      loadCustomers();
  
      Swal.fire('نجاح', 'تم حذف المعاملة بنجاح', 'success');
    } catch (error) {
      Swal.fire('خطأ', 'حدث خطأ أثناء الحذف: ' + error.message, 'error');
    }
  };







   // إدارة الواجهة




window.showAddCustomerModal = () => {
    document.getElementById('addCustomerModal').style.display = 'flex';
}

window.closeAddCustomerModal = () => {
    document.getElementById('addCustomerModal').style.display = 'none';
    document.getElementById('newCustomerName').value = '';
}


 // دعم زر Enter
 window.handleEnter = (e) => {
  if (e.key === 'Enter') addTransaction('credit');
};


    // إعدادات iziToast العامة
    iziToast.settings({
      timeout: 5000, // مدة عرض الإشعار
      resetOnHover: true, // إعادة ضبط المؤقت عند التحويم
      position: 'topLeft', // موضع الإشعار
      transitionIn: 'bounceInDown', // تأثير الدخول
      transitionOut: 'fadeOut' // تأثير الخروج
    });













