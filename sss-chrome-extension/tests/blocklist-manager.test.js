import { beforeEach, describe, expect, it, vi } from 'vitest'
import BlocklistManager from '../background/blocklist-manager.js'

describe('BlocklistManager', () => {
  beforeEach(() => {
    global.chrome = {
      declarativeNetRequest: {
        getDynamicRules: vi.fn().mockResolvedValue([]),
        updateDynamicRules: vi.fn().mockResolvedValue(undefined)
      },
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn().mockResolvedValue(undefined),
          remove: vi.fn().mockResolvedValue(undefined)
        },
        session: {
          get: vi.fn().mockResolvedValue({ isAuthenticated: true })
        }
      }
    }
  })

  it('converts wildcard catch-all urlFilter into regexFilter', () => {
    const manager = new BlocklistManager()
    const condition = manager.sanitizeCondition({
      urlFilter: '*',
      resourceTypes: ['main_frame']
    })

    expect(condition).toEqual({
      regexFilter: '^https?://.+',
      resourceTypes: ['main_frame']
    })
  })

  it('drops invalid rules and applies only valid conditions', async () => {
    const manager = new BlocklistManager()

    await manager.applyRules([
      {
        priority: 1,
        action: { type: 'block' },
        condition: { urlFilter: '*' }
      },
      {
        priority: 1,
        action: { type: 'block' },
        condition: { urlFilter: '' }
      },
      {
        priority: 1,
        action: { type: 'block' },
        condition: { urlFilter: '||example.com' }
      }
    ])

    expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledTimes(1)
    expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith({
      addRules: [
        {
          id: 1,
          priority: 1,
          action: { type: 'block' },
          condition: {
            regexFilter: '^https?://.+',
            resourceTypes: ['main_frame', 'sub_frame']
          }
        },
        {
          id: 3,
          priority: 1,
          action: { type: 'block' },
          condition: {
            urlFilter: '||example.com',
            resourceTypes: ['main_frame', 'sub_frame']
          }
        }
      ]
    })
  })

  it('matches blocked domains even when stored with scheme', async () => {
    const manager = new BlocklistManager()
    chrome.storage.local.get.mockResolvedValue({
      blockedDomains: ['https://www.youtube.com/watch'],
      allowlistDomains: [],
      allowOnlyListed: false,
      blocklistRules: []
    })

    const result = await manager.isUrlBlocked('https://youtube.com/learn')
    expect(result.blocked).toBe(true)
  })
})
