import React, { useState } from 'react';
import { EARN_RULES, REWARDS, type Reward } from '../data/rewards';
import { FUNDING_SOURCES } from '../data/dashboard';
import { useStore, voucherCode } from '../store';
import { go, type TabId } from '../nav';
import { BarList } from '../components/charts';
import { Icon, PageHead, Pts, SimNote, Status } from '../components/ui';

function RewardCard({ r }: { r: Reward }) {
  const { state, balance, spend, update } = useStore();
  const [confirm, setConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const unlocked = !r.gate || r.gate.ok(state);
  const affordable = balance >= r.cost;
  const voucher = state.vouchers.find((v) => v.rewardId === r.id);

  const redeem = () => {
    if (!spend(`Redeemed ${r.name}`, r.cost)) return;
    const code = voucherCode(`${r.id}-${Date.now()}`);
    update((s) => ({ ...s, vouchers: [{ id: `${r.id}-${Date.now()}`, rewardId: r.id, code, at: Date.now() }, ...s.vouchers] }));
    setConfirm(false);
  };

  const copy = (code: string) => {
    navigator.clipboard?.writeText(code).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      },
      () => setCopied(false),
    );
  };

  return (
    <article className={`reward ${unlocked ? '' : 'locked'}`}>
      <div className="reward-top">
        <span className="reward-kind">{r.kind}</span>
        <Pts n={r.cost} />
      </div>
      <h3>
        {r.name}
        <span className="zh">{r.zh}</span>
      </h3>
      <p>{r.detail}</p>
      <p className="guardrail">
        <Icon name="shield" size={14} /> {r.guardrail}
      </p>
      {r.gate && (
        <p className={`gate ${unlocked ? 'ok' : ''}`}>
          <Icon name={unlocked ? 'check' : 'lock'} size={14} /> {r.gate.label}
        </p>
      )}
      {voucher ? (
        <div className="voucher">
          <span className="muted small">Your demo voucher</span>
          <code>{voucher.code}</code>
          <button className="btn small ghost" onClick={() => copy(voucher.code)}>
            <Icon name="copy" size={14} /> {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      ) : confirm ? (
        <div className="confirm">
          <span>
            Spend {r.cost.toLocaleString()} of your {balance.toLocaleString()} points?
          </span>
          <div className="cta-row">
            <button className="btn small primary" onClick={redeem}>
              Redeem
            </button>
            <button className="btn small ghost" onClick={() => setConfirm(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="btn primary" disabled={!unlocked || !affordable} onClick={() => setConfirm(true)}>
          {!unlocked ? 'Locked' : affordable ? 'Redeem' : `${(r.cost - balance).toLocaleString()} more points needed`}
        </button>
      )}
    </article>
  );
}

export default function Rewards() {
  const { state, balance, earned, reset } = useStore();
  const [resetAsk, setResetAsk] = useState(false);
  return (
    <div className="view">
      <PageHead kicker="Earn · token exchange" title="Exchange" zh="積分兌換">
        Points become model credits, compute and a path to funding. Access grows with skill: API keys unlock only after the prompt safety course,
        and funding needs an audited project.
      </PageHead>

      <div className="wallet-row">
        <div className="panel wallet-card">
          <span className="muted">Balance</span>
          <div className="big-num">
            <Icon name="coin" size={30} /> {balance.toLocaleString()}
          </div>
          <span className="muted">{earned.toLocaleString()} earned in total</span>
        </div>
        <div className="panel min0">
          <h3 className="h3">Ways to earn</h3>
          <table className="table compact">
            <tbody>
              {EARN_RULES.map((e) => (
                <tr key={e.how}>
                  <td>{e.how}</td>
                  <td className="tnum">
                    <b>{e.pts}</b>
                  </td>
                  <td>
                    <button className="link" onClick={() => go(e.where as TabId)}>
                      Go <Icon name="arrow" size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="reward-grid">
        {REWARDS.map((r) => (
          <RewardCard key={r.id} r={r} />
        ))}
      </div>
      <SimNote>
        Vouchers here are demo codes and do not work with any provider. Brand names show the kind of reward the scheme would offer through
        sponsorship; none are confirmed partners.
      </SimNote>

      <section className="block two-col">
        <div className="min0">
          <h2 className="h2">Ledger</h2>
          <ul className="ledger">
            {state.ledger.slice(0, 14).map((e) => (
              <li key={e.id}>
                <span className="muted tnum">{new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="min0">{e.label}</span>
                <Pts n={e.amount} sign />
              </li>
            ))}
          </ul>
          {resetAsk ? (
            <div className="confirm">
              <span>Clear all your progress in this browser?</span>
              <div className="cta-row">
                <button
                  className="btn small"
                  onClick={() => {
                    reset();
                    setResetAsk(false);
                  }}
                >
                  Clear progress
                </button>
                <button className="btn small ghost" onClick={() => setResetAsk(false)}>
                  Keep it
                </button>
              </div>
            </div>
          ) : (
            <button className="link muted" onClick={() => setResetAsk(true)}>
              Reset demo progress
            </button>
          )}
        </div>
        <div className="min0">
          <h2 className="h2">Who pays for the rewards</h2>
          <p className="muted">
            The loop is sustainable when rewards are funded by the value the projects create. Planned split of the reward pool:
          </p>
          <BarList rows={FUNDING_SOURCES.map((f) => ({ label: f.source, value: Math.round(f.share * 100) }))} format={(v) => `${v}%`} max={100} />
          <div className="loop-mini">
            <Status kind="info">Learn</Status>
            <Icon name="arrow" size={14} />
            <Status kind="info">Use</Status>
            <Icon name="arrow" size={14} />
            <Status kind="info">Expand impact</Status>
            <Icon name="arrow" size={14} />
            <Status kind="good">Funds the next learners</Status>
          </div>
        </div>
      </section>
    </div>
  );
}
