import { useRxSet, useRxValue } from "@effect-rx/rx-react"
import React from "react"
import { graphDataSectionsRx, setFocusedLevelRx } from "../../services/LayoutRx.js"
import { focusedLevelRx } from "../../services/WorkspaceRx.js"
import { NlpView } from "../NlpView.js"
import { DataSection } from "./DataSection.js"

/**
 * Main content body - the primary reading column.
 *
 * Observable-inspired design:
 * - Optimal reading width (680px max)
 * - Clear vertical rhythm
 * - Focus on content, not chrome
 * - Section-anchored annotations
 * - Reactive data flow from RX state
 */
export const ContentBody: React.FC = () => {
  const dataSections = useRxValue(graphDataSectionsRx)
  const focusedLevel = useRxValue(focusedLevelRx)
  const setFocusedLevel = useRxSet(setFocusedLevelRx)

  return (
    <>
      <NlpView />
      {dataSections.map((section) => (
        <DataSection
          key={section.id}
          title={section.title}
          level={section.level}
          data={section.data}
          isActive={section.level === focusedLevel}
          onFocus={() => setFocusedLevel(section.level)}
        />
      ))}
    </>
  )
}
