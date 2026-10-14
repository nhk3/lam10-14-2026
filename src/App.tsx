import { useEffect, useState, type FormEvent } from "react";
import "./App.css";

type Account = {
  id: string;
  riotId: string;
  description: string;
};

type StoredAccounts = {
  accounts: Account[];
  notice: string | null;
};

const ACCOUNTS_STORAGE_KEY = "league-account-manager.accounts.v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function loadAccounts(): StoredAccounts {
  let savedData: string | null;

  try {
    savedData = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY);
  } catch {
    return {
      accounts: [],
      notice: "Local account storage is unavailable. Changes may not be saved.",
    };
  }

  if (savedData === null) {
    return { accounts: [], notice: null };
  }

  let parsedData: unknown;
  try {
    parsedData = JSON.parse(savedData);
  } catch {
    return {
      accounts: [],
      notice: "Saved account data was invalid and has been ignored.",
    };
  }

  if (!Array.isArray(parsedData)) {
    return {
      accounts: [],
      notice: "Saved account data was invalid and has been ignored.",
    };
  }

  const accounts: Account[] = [];
  const accountIds = new Set<string>();
  let skippedInvalidAccount = false;

  for (const value of parsedData) {
    if (
      !isRecord(value) ||
      typeof value.id !== "string" ||
      value.id.length === 0 ||
      typeof value.riotId !== "string" ||
      value.riotId.trim().length === 0 ||
      typeof value.description !== "string" ||
      accountIds.has(value.id)
    ) {
      skippedInvalidAccount = true;
      continue;
    }

    accountIds.add(value.id);
    accounts.push({
      id: value.id,
      riotId: value.riotId,
      description: value.description,
    });
  }

  return {
    accounts,
    notice: skippedInvalidAccount
      ? "Some saved account data was invalid and has been ignored."
      : null,
  };
}

function App() {
  const [initialAccounts] = useState(loadAccounts);
  const [accounts, setAccounts] = useState(initialAccounts.accounts);
  const [storageNotice] = useState(initialAccounts.notice);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [riotId, setRiotId] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    try {
      window.localStorage.setItem(
        ACCOUNTS_STORAGE_KEY,
        JSON.stringify(accounts),
      );
      setSaveError(null);
    } catch {
      setSaveError("Could not save accounts locally. Your latest changes may be lost.");
    }
  }, [accounts]);

  function addAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedRiotId = riotId.trim();

    if (!trimmedRiotId) {
      return;
    }

    setAccounts((currentAccounts) => [
      ...currentAccounts,
      {
        id: crypto.randomUUID(),
        riotId: trimmedRiotId,
        description: description.trim(),
      },
    ]);
    setRiotId("");
    setDescription("");
    setIsAddingAccount(false);
  }

  function updateDescription(id: string, nextDescription: string) {
    setAccounts((currentAccounts) =>
      currentAccounts.map((account) =>
        account.id === id ? { ...account, description: nextDescription } : account,
      ),
    );
  }

  function deleteAccount(id: string) {
    setAccounts((currentAccounts) =>
      currentAccounts.filter((account) => account.id !== id),
    );
  }

  function cancelAddingAccount() {
    setRiotId("");
    setDescription("");
    setIsAddingAccount(false);
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">ACCOUNT MANAGER</p>
          <h1>League Account Manager</h1>
        </div>
        <button
          className="button button-primary"
          onClick={() => setIsAddingAccount((isAdding) => !isAdding)}
          type="button"
        >
          {isAddingAccount ? "Close" : "Add Account"}
        </button>
      </header>

      {isAddingAccount && (
        <form className="add-account-form" onSubmit={addAccount}>
          <label className="field">
            <span>Riot ID</span>
            <input
              autoFocus
              onChange={(event) => setRiotId(event.currentTarget.value)}
              placeholder="Username#TAG"
              required
              value={riotId}
            />
          </label>
          <label className="field">
            <span>Description <span className="optional">(optional)</span></span>
            <input
              onChange={(event) => setDescription(event.currentTarget.value)}
              placeholder="Add a description..."
              value={description}
            />
          </label>
          <div className="form-actions">
            <button className="button button-secondary" onClick={cancelAddingAccount} type="button">
              Cancel
            </button>
            <button className="button button-primary" type="submit">
              Save Account
            </button>
          </div>
        </form>
      )}

      <section className="account-section" aria-label="Accounts">
        <div className="section-heading">
          <h2>Accounts</h2>
          <span className="account-count">{accounts.length}</span>
        </div>

        {accounts.length === 0 ? (
          <div className="empty-state">
            <h3>No accounts yet</h3>
            <p>Add an account to keep its Riot ID and a short description here.</p>
            {!isAddingAccount && (
              <button
                className="button button-secondary"
                onClick={() => setIsAddingAccount(true)}
                type="button"
              >
                Add your first account
              </button>
            )}
          </div>
        ) : (
          <ul className="account-list">
            {accounts.map((account) => (
              <li className="account-row" key={account.id}>
                <div className="account-details">
                  <span className="riot-id">{account.riotId}</span>
                  <label className="description-field">
                    <span className="visually-hidden">
                      Description for {account.riotId}
                    </span>
                    <input
                      aria-label={`Description for ${account.riotId}`}
                      onChange={(event) =>
                        updateDescription(account.id, event.currentTarget.value)
                      }
                      placeholder="Add a description"
                      value={account.description}
                    />
                  </label>
                </div>
                <div className="row-actions">
                  <button className="button button-login" type="button" disabled>
                    Login (placeholder)
                  </button>
                  <button
                    aria-label={`Delete ${account.riotId}`}
                    className="button button-delete"
                    onClick={() => deleteAccount(account.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="app-footer" role="status">
        {saveError ??
          storageNotice ??
          "Accounts are saved locally on this device. No credentials are stored."}
      </footer>
    </main>
  );
}

export default App;
