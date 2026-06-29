import chalk from 'chalk'

const RISK_LEVELS = ['GREEN', 'BLUE', 'YELLOW', 'ORANGE', 'RED', 'BLACK']

export class TroxTThirdEye {
  constructor() {
    this.history      = []
    this.currentLevel = 'GREEN'
    this.rules = [
      this.checkMassProduction,
      this.checkUnvalidatedSystem,
      this.checkCriticalAction,
      this.checkRateLimit,
    ]
    console.log(chalk.yellow('👁  Third Eye actif — surveillance initialisée'))
  }

  // Évaluation principale
  evaluate(data) {
    let maxLevel = 'GREEN'
    const reasons = []

    for (const rule of this.rules) {
      const result = rule.call(this, data)
      if (result.triggered) {
        reasons.push(result.reason)
        if (RISK_LEVELS.indexOf(result.level) > 
            RISK_LEVELS.indexOf(maxLevel)) {
          maxLevel = result.level
        }
      }
    }

    this.currentLevel = maxLevel
    const confidence  = this.scoreConfidence(maxLevel)

    this.log(maxLevel, reasons)

    return {
      level:      maxLevel,
      confidence,
      reasons,
      reason:     reasons[0] || 'OK',
      canProceed: !['RED', 'BLACK'].includes(maxLevel),
    }
  }

  // Règles de surveillance
  checkMassProduction(data) {
    if (data?.count > 500) {
      return { 
        triggered: true, 
        level: 'ORANGE', 
        reason: 'Production massive sans règles validées' 
      }
    }
    return { triggered: false }
  }

  checkUnvalidatedSystem(data) {
    if (data?.agents?.includes('forge') && !data?.validated) {
      return { 
        triggered: true, 
        level: 'YELLOW', 
        reason: 'Forge sans validation préalable' 
      }
    }
    return { triggered: false }
  }

  checkCriticalAction(data) {
    const criticalActions = ['DELETE_ALL', 'RESET_ECONOMY', 'DROP_TABLE']
    if (criticalActions.includes(data?.action)) {
      return { 
        triggered: true, 
        level: 'RED', 
        reason: `Action critique détectée: ${data.action}` 
      }
    }
    return { triggered: false }
  }

  checkRateLimit(data) {
    const recent = this.history.filter(
      h => Date.now() - h.timestamp < 1000
    )
    if (recent.length > 100) {
      return { 
        triggered: true, 
        level: 'ORANGE', 
        reason: 'Rate limit dépassé (>100 req/s)' 
      }
    }
    this.history.push({ timestamp: Date.now(), data })
    return { triggered: false }
  }

  scoreConfidence(level) {
    const scores = { 
      GREEN: 95, BLUE: 85, YELLOW: 70, 
      ORANGE: 40, RED: 10, BLACK: 0 
    }
    return scores[level] ?? 50
  }

  log(level, reasons) {
    const colors = {
      GREEN:  chalk.green,
      BLUE:   chalk.blue,
      YELLOW: chalk.yellow,
      ORANGE: chalk.hex('#FFA500'),
      RED:    chalk.red,
      BLACK:  chalk.bgRed.white,
    }
    const color = colors[level] || chalk.white
    console.log(color(
      `👁  Third Eye [${level}] ${reasons.join(' | ') || 'Stable'}`
    ))
  }
}