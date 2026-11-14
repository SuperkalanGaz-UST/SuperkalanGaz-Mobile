export interface ServiceRequestItem {
  cylinder_size: string;
  quantity: number;
}

export interface ServiceRequestCylinderFields extends ServiceRequestItem {
  items?: ServiceRequestItem[];
}

export function serviceRequestItems(order: ServiceRequestCylinderFields): ServiceRequestItem[] {
  return order.items?.length ? order.items : [{
    cylinder_size: order.cylinder_size,
    quantity: order.quantity,
  }];
}

export function cylinderSummary(order: ServiceRequestCylinderFields): string {
  return serviceRequestItems(order).map(item => `${item.quantity} × ${item.cylinder_size}`).join(', ');
}
