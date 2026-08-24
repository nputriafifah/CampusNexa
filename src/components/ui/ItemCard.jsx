import { Link } from 'react-router-dom'
import { Heart, Leaf, MapPin, Sparkles } from 'lucide-react'
import { Badge, listingLabel, statusLabel } from './Badge'
import {
  conditionAnalysisText,
  impactBadgeText,
  isGreenChoice,
  walkEstimate,
} from '../../lib/itemInsights'

export function ItemCard({
  item,
  to,
  isFavorite = false,
  onToggleFavorite,
  aiRecommended = false,
  showInsights = false,
  user = null,
}) {
  const href = to || `/app/exchange/${item.dbId || item.id}`
  const recommended = aiRecommended || item.aiRecommended
  const matchPercent = item.matchPercent
  const analysis = conditionAnalysisText(item.condition)
  const walk = showInsights ? walkEstimate(item, user) : null
  const greenChoice =
    item.greenChoice ?? (showInsights && isGreenChoice(item, user))

  return (
    <Link to={href} className="group lift surface relative block overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--mint)]">
        <img
          src={item.image}
          alt={item.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
        <div className="pointer-events-none absolute left-3 top-3 flex max-w-[80%] flex-wrap gap-2">
          <Badge tone={item.listingType}>{listingLabel(item.listingType)}</Badge>
          <Badge tone={item.status}>{statusLabel(item.status)}</Badge>
        </div>
        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleFavorite(item)
            }}
            className={`absolute right-3 top-3 z-20 rounded-full border bg-white/95 p-2 shadow-sm transition ${
              isFavorite
                ? 'border-[var(--ember)] text-[var(--ember)]'
                : 'border-[var(--line)] text-[var(--muted)] hover:text-[var(--ember)]'
            }`}
            aria-label={isFavorite ? 'Hapus favorit' : 'Simpan favorit'}
          >
            <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>
      <div className="space-y-2 p-4">
        {(recommended || matchPercent != null || greenChoice) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {matchPercent != null && (
              <p className="inline-flex items-center gap-1 rounded-full bg-[#e8f5ee] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--forest-deep)]">
                <Sparkles size={11} />
                Kecocokan {matchPercent}%
              </p>
            )}
            {recommended && matchPercent == null && (
              <p className="inline-flex items-center gap-1 rounded-full bg-[#e8f5ee] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--forest-deep)]">
                <Sparkles size={11} />
                Cocok untukmu
              </p>
            )}
            {greenChoice ? (
              <p className="inline-flex items-center gap-1 rounded-full bg-[#eef3f0] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--forest-deep)]">
                <Leaf size={11} />
                Green Choice
              </p>
            ) : null}
          </div>
        )}
        <h3 className="font-display text-lg leading-snug text-[var(--ink)] transition group-hover:text-[var(--forest)]">
          {item.title}
        </h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-[var(--muted)]">{item.description}</p>

        {showInsights && (
          <div className="space-y-1.5 pt-0.5">
            {analysis && (
              <p className="text-[11px] leading-snug text-[var(--ink)]">
                <span className="font-semibold">Analisis AI</span>
                <span className="text-[var(--muted)]"> · Kondisi {analysis}</span>
              </p>
            )}
            {item.matchSummary && matchPercent != null && (
              <p className="text-[11px] leading-snug text-[var(--muted)]">{item.matchSummary}</p>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f5ee] px-2 py-0.5 text-[11px] font-semibold text-[var(--forest-deep)]">
              <Leaf size={11} />
              {impactBadgeText(item)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-1 text-sm text-[var(--muted)]">
          <span className="inline-flex min-w-0 flex-col gap-0.5">
            <span className="inline-flex min-w-0 items-center gap-1 truncate">
              <MapPin size={14} className="shrink-0" />
              <span className="truncate">{item.location}</span>
            </span>
            {walk ? <span className="pl-5 text-xs text-[var(--forest)]">{walk.label}</span> : null}
          </span>
          <span className="shrink-0 font-semibold text-[var(--forest)]">
            {item.listingType === 'sell'
              ? `Rp ${Number(item.price || 0).toLocaleString('id-ID')}`
              : item.listingType === 'exchange'
                ? item.lookingFor
                  ? `Tukar · ${item.lookingFor}`
                  : 'Tukar'
                : item.listingType === 'donate'
                  ? 'Gratis'
                  : 'Pinjam'}
          </span>
        </div>
      </div>
    </Link>
  )
}
