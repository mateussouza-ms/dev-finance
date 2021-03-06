import { Firebase } from "../../services/firebase.js";

const Modal = {
  open() {
    document.querySelector(".modal-overlay").classList.add("active");
  },
  close() {
    document.querySelector(".modal-overlay").classList.remove("active");
  },
};

const Storage = {
  get() {
    return JSON.parse(localStorage.getItem("dev.finance:transactions")) || [];
  },

  set(transactions) {
    localStorage.setItem(
      "dev.finance:transactions",
      JSON.stringify(transactions)
    );
  },
};

const Balance = {
  incomes() {
    let totalIncomes = 0;
    Transaction.all.forEach((transaction) => {
      if (transaction.amount > 0) {
        totalIncomes += transaction.amount;
      }
    });
    return totalIncomes;
  },

  expenses() {
    let totalExpenses = 0;
    Transaction.all.forEach((transaction) => {
      if (transaction.amount < 0) {
        totalExpenses += transaction.amount;
      }
    });

    return totalExpenses;
  },

  total() {
    return Balance.incomes() + Balance.expenses();
  },
};

const Transaction = {
  all: Storage.get(),

  add(transaction) {
    let latestId = 0;

    if (Transaction.all.length > 0) {
      latestId = Transaction.all[Transaction.all.length - 1].id;
    }

    transaction["id"] = latestId + 1;

    Transaction.all.push(transaction);
    Home.reload();
  },

  remove(id) {
    const index = Transaction.all.findIndex(
      (transaction) => transaction.id == id
    );
    Transaction.all.splice(index, 1);
    Home.reload();
  },
};

const Form = {
  description: document.querySelector("input#description"),
  amount: document.querySelector("input#amount"),
  date: document.querySelector("input#date"),

  getValues() {
    return {
      description: Form.description.value,
      amount: Form.amount.value,
      date: Form.date.value,
    };
  },

  validateFields() {
    const { description, amount, date } = Form.getValues();
    if (
      description.trim() === "" ||
      amount.trim() === "" ||
      date.trim() == ""
    ) {
      throw new Error("Por favor, preencha todos os campos do formul??rio!");
    }
  },

  formatValues() {
    let { description, amount, date } = Form.getValues();

    description = description.trim();
    amount = Utils.formatAmount(amount);
    date = Utils.formatDate(date);

    return { description, amount, date };
  },

  clearFields() {
    Form.description.value = "";
    Form.amount.value = "";
    Form.date.value = "";
  },

  submit(event) {
    event.preventDefault();

    try {
      Form.validateFields();
      const transaction = Form.formatValues();
      Transaction.add(transaction);
      Form.clearFields();
      Modal.close();
    } catch (error) {
      alert(error.message);
    }
  },
};

const UserInfo = {
  listener(event) {
    const avatarInfo = document.querySelector(".avatar-info");
    const avatarImg = document.querySelector(".avatar img");

    if (
      !avatarInfo ||
      avatarInfo.contains(event.target) ||
      avatarImg.contains(event.target)
    ) {
      return;
    }

    UserInfo.close();
  },
  open() {
    const avatarInfo = document.querySelector(".avatar-info");
    avatarInfo.classList.add("active");

    document.addEventListener("click", UserInfo.listener);
  },
  close() {
    document.querySelector(".avatar-info").classList.remove("active");
    document.removeEventListener("click", UserInfo.listener);
  },
  toggle() {
    !document.querySelector(".avatar-info").classList.contains("active")
      ? UserInfo.open()
      : UserInfo.close();
  },
};

const Home = {
  Modal,
  Storage,
  Balance,
  Transaction,
  Form,
  UserInfo,
  DOM: {
    transactionsContainer: document.querySelector("#transactions-table tbody"),

    addTransaction(transaction) {
      const transactionRow = document.createElement("tr");
      transactionRow.innerHTML = Home.DOM.innerHTMLTransaction(transaction);
      transactionRow
        .querySelector(".actions img")
        .addEventListener("click", () => Transaction.remove(transaction.id));
      Home.DOM.transactionsContainer.appendChild(transactionRow);
    },

    innerHTMLTransaction(transaction) {
      let cssClass = "";
      if (transaction.amount < 0) {
        cssClass = "expense";
      }

      if (transaction.amount > 0) {
        cssClass = "income";
      }

      return ` 
      <td class="description">${transaction.description}</td>
      <td class=${cssClass}>${Utils.formatCurrency(transaction.amount)}</td>
      <td class="date">${transaction.date}</td>
      <td class="actions">
        <img 
          src="/assets/minus.svg" 
          alt="Excluir transa????o" 
          title="Excluir transa????o"
        >
      </td>
    `;
    },

    updateBalance() {
      document.querySelector("#incomes").innerHTML = Utils.formatCurrency(
        Balance.incomes()
      );
      document.querySelector("#expenses").innerHTML = Utils.formatCurrency(
        Balance.expenses()
      );
      document.querySelector("#total").innerHTML = Utils.formatCurrency(
        Balance.total()
      );
    },

    clearTransactions() {
      Home.DOM.transactionsContainer.innerHTML = "";
    },

    updateUser(user) {
      const avatarImg = document.getElementById("avatar-img");
      if (avatarImg) {
        avatarImg.src = user.photoURL;
        avatarImg.addEventListener("click", () => {
          Home.UserInfo.toggle(Firebase.auth);
        });
        document.getElementById("logout-link").addEventListener("click", () => {
          Firebase.signOut(Firebase.auth);
        });
      }
    },
  },

  init() {
    Transaction.all.forEach(Home.DOM.addTransaction);
    Home.DOM.updateBalance();
    Storage.set(Transaction.all);

    document
      .getElementById("new-transaction")
      .addEventListener("click", Modal.open);
    document
      .getElementById("close-modal")
      .addEventListener("click", Modal.close);
    document
      .getElementById("add-transaction-form")
      .addEventListener("submit", Form.submit);
  },

  reload() {
    Home.DOM.clearTransactions();
    Home.init();
  },
};

const Utils = {
  formatCurrency(value) {
    const signal = Number(value) < 0 ? "-" : "";
    value = String(value).replace(/\D/g, "");
    value = Number(value) / 100;
    value = Number(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    return signal + value;
  },

  formatAmount(value) {
    value = Number(value) * 100;
    return Math.round(value);
  },

  formatDate(date) {
    const splittedDate = date.split("-");
    const year = splittedDate[0];
    const month = splittedDate[1];
    const day = splittedDate[2];

    return `${day}/${month}/${year}`;
  },
};

const Auth = {
  init() {
    document.getElementById("sign-button").addEventListener("click", () => {
      Firebase.signInWithGoogle();
    });
  },
};

const App = {
  init() {
    let page = "";

    if (window.location.href.includes("/pages/Home")) {
      page = "HOME";
      Home.init();
    }
    if (window.location.href.includes("/pages/Auth")) {
      page = "HOME";
      Auth.init();
    }

    window.addEventListener("load", () => {
      window.unsubscribe = Firebase.onAuthStateChanged(
        Firebase.auth,
        async (authUser) => {
          if (authUser) {
            Firebase.user = authUser;
            Home.DOM.updateUser(authUser);
            !window.location.href.includes("/pages/Home") &&
              window.location.replace("/pages/Home");
          } else {
            Firebase.user = null;
            !window.location.href.includes("/pages/Auth") &&
              window.location.replace("/pages/Auth");
          }
        }
      );
    });

    window.addEventListener("unload", () => {
      window.unsubscribe();
    });
  },
};

App.init();
