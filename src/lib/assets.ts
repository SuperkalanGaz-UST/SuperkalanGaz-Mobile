/**
 * Central image registry. Metro requires static `require()` paths, so every
 * bundled PNG is resolved once here and referenced by key from the screens.
 * Cylinder art is keyed by size to match the Figma product catalog.
 */
export const images = {
  logo: require('../../assets/images/superkalan-gaz.png'),
  orderBag: require('../../assets/images/order-bag.png'),

  // Cylinders by size label
  cyl27: require('../../assets/images/2.7kg.png'),
  cyl5: require('../../assets/images/5kg.png'),
  cyl11: require('../../assets/images/11kg.png'),
  cyl22: require('../../assets/images/22kg.png'),
  cyl50: require('../../assets/images/50kg.png'),

  // Rewards catalog
  rewardNotebook: require('../../assets/images/reward-notebook.png'),
  rewardCalendar: require('../../assets/images/reward-calendar.png'),
  rewardUmbrella: require('../../assets/images/reward-umbrella.png'),
  rewardMug: require('../../assets/images/reward-mug.png'),

  // Payment logos
  gcash: require('../../assets/images/gcash.png'),
  maya: require('../../assets/images/maya.png'),

  // Promo + mascots (app guide / feedback)
  promo: require('../../assets/images/promo.png'),
  mascotSad: require('../../assets/images/mascot-sad.png'),
  mascotWave: require('../../assets/images/mascot-wave.png'),
  mascotRewards: require('../../assets/images/mascot-rewards.png'),
  mascotOrder: require('../../assets/images/mascot-order.png'),
  mascotQuick: require('../../assets/images/mascot-quick.png'),
} as const;

/** Cylinder image for a size label such as "11 KG" / "2.7 KG". */
export function cylinderFor(size: string) {
  const key = size.replace(/\s*KG/i, '').trim();
  switch (key) {
    case '2.7':
      return images.cyl27;
    case '5':
      return images.cyl5;
    case '22':
      return images.cyl22;
    case '50':
      return images.cyl50;
    case '11':
    default:
      return images.cyl11;
  }
}
