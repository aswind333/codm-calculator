import { useEffect, useState } from 'react'
import { CalculatorPage } from './features/calculator/CalculatorPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { browserStorage } from './storage/browserStorage'
import { loadSettings, saveSettings } from './storage/storage'
import type { StorageAdapter } from './storage/storage'
import type { DrawConfig } from './domain/types'
import { RulesPage } from './features/rules/RulesPage'
import './App.css'

export default function App({ storage = browserStorage }: { storage?: StorageAdapter }) {
  const [initial] = useState(() => loadSettings(storage))
  const [saved, setSaved] = useState(initial.configs)
  const [page, setPage] = useState<'calculator' | 'settings' | 'rules'>('calculator')
  const [dirty, setDirty] = useState(false)
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  function leaveSettings(destination: 'calculator' | 'rules' = 'calculator') {
    if (dirty && !window.confirm('有未保存的修改。确定将放弃修改并离开；取消可继续编辑。')) return
    setDirty(false); setPage(destination)
  }
  function save(configs: DrawConfig[]) {
    const result = saveSettings(storage, configs)
    if (result.ok) setSaved(configs)
    return result
  }
  return <div className="app-shell">
    <a className="skip-link" href={page === 'calculator' ? '#main' : `#${page}-main`}>跳到主要内容</a>
    <header className="site-header"><div className="brand"><span className="brand-symbol" aria-hidden="true">C</span><div><strong>CODM 抽奖计算器</strong><small>概率 · 花费 · 性价比</small></div></div>
      <nav aria-label="页面导航">
        <button aria-current={page === 'calculator' ? 'page' : undefined} onClick={() => leaveSettings()}>概率计算</button>
        <button aria-current={page === 'rules' ? 'page' : undefined} onClick={() => leaveSettings('rules')}>规则说明</button>
        <button className="settings-entry" aria-current={page === 'settings' ? 'page' : undefined} title="可自定义概率与价格" onClick={() => setPage('settings')}><span className="settings-gear" aria-hidden="true">⚙</span> 设置</button>
      </nav>
    </header>
    {initial.warning && <p role="alert" className="error-note">{initial.warning}</p>}
    <div hidden={page !== 'calculator'}><CalculatorPage configs={saved} storage={storage} /></div>
    {page === 'settings' && <SettingsPage saved={saved} onSave={save} onDirty={setDirty} onLeave={() => leaveSettings()} />}
    {page === 'rules' && <RulesPage onReturn={() => leaveSettings()} />}
    <footer>非官方玩家工具 · 设置与记录仅保存在当前设备浏览器。实际转盘价格、奖品概率和活动规则请以游戏内说明为准。</footer>
  </div>
}
