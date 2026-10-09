import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const isElectron = typeof window !== 'undefined' && !!window.electronAPI

const AccountsContext = createContext(null)

export function AccountsProvider({ children }) {
  const [accounts, setAccounts] = useState([])
  const [selectedAccountId, setSelectedAccountId] = useState(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!isElectron) { setLoading(false); return }
    try {
      const r = await window.electronAPI.getAccounts()
      setAccounts(r?.accounts || [])
      setSelectedAccountId(r?.selectedAccountId || null)
    } catch { setAccounts([]); setSelectedAccountId(null) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { reload() }, [reload])

  const loginMicrosoft = useCallback(async () => {
    if (!isElectron) return { error: 'Electron không khả dụng' }
    const r = await window.electronAPI.loginMicrosoft()
    if (r?.ok) {
      await reload()
      return { ok: true, account: r.account }
    }
    return { error: r?.error || 'Đăng nhập thất bại' }
  }, [reload])

  const removeAccount = useCallback(async (id) => {
    if (!isElectron) return { error: 'Electron không khả dụng' }
    const r = await window.electronAPI.removeAccount(id)
    if (r?.error) return r
    await reload()
    return { ok: true }
  }, [reload])

  const selectAccount = useCallback(async (id) => {
    if (!isElectron) return { error: 'Electron không khả dụng' }
    const r = await window.electronAPI.selectAccount(id)
    if (r?.error) return r
    setSelectedAccountId(id)
    return { ok: true }
  }, [])

  const addAccount = useCallback(async (account) => {
    if (account._msAlreadySaved) {
      await reload()
      return { ok: true }
    }
    if (!isElectron) return { error: 'Electron không khả dụng' }
    const r = await window.electronAPI.addAccount(account)
    if (r?.error) return r
    await reload()
    return { ok: true }
  }, [reload])

  const updateAccount = useCallback(async (id, patch) => {
    if (!isElectron) return { error: 'Electron không khả dụng' }
    const r = await window.electronAPI.updateAccount(id, patch)
    if (r?.error) return r
    await reload()
    return { ok: true }
  }, [reload])

  const refreshAccount = useCallback(async (id) => {
    if (!isElectron) return { error: 'Electron không khả dụng' }
    const r = await window.electronAPI.refreshAccount(id)
    return r
  }, [])

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) || null,
    [accounts, selectedAccountId],
  )

  const value = {
    accounts,
    selectedAccount,
    selectedAccountId,
    selectedId: selectedAccountId,
    loading,
    loginMicrosoft,
    addAccount,
    updateAccount,
    removeAccount,
    selectAccount,
    refreshAccount,
    reload,
  }

  return <AccountsContext.Provider value={value}>{children}</AccountsContext.Provider>
}

export function useAccounts() {
  const ctx = useContext(AccountsContext)
  if (!ctx) throw new Error('useAccounts must be used within AccountsProvider')
  return ctx
}
