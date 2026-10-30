/**
 * controllers/orderController.js
 */

const OrderModel = require('../models/Order');
const OrderService = require('../services/orderService');
const AuditLogModel = require('../models/AuditLog');
const { ApiError } = require('../middleware/errorHandler');
const DELIVERY_COVERAGE = require('../config/deliveryCoverage.json');

const VALID_PAYMENT_METHODS = ['cod', 'esewa'];
const DELIVERY_CITIES = new Set(['Kathmandu', 'Bhaktapur', 'Lalitpur', 'Banepa']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_STATUSES = ['pending', 'confirmed', 'processing', 'ready', 'shipped', 'delivered', 'cancelled', 'returned'];

async function create(req, res, next) {
  try {
    const { checkoutToken, customerName, customerPhone, customerEmail, shippingAddress, items, paymentMethod, customerNote } = req.body || {};

    if (!customerName || !customerPhone || !shippingAddress || !items) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'customerName, customerPhone, shippingAddress, and items are required.');
    }
    if (String(customerName).trim().length < 2 || String(customerName).trim().length > 120) throw new ApiError(400, 'INVALID_CUSTOMER_NAME', 'Enter a valid recipient name.');
    const phoneDigits = String(customerPhone).replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 13) throw new ApiError(400, 'INVALID_CUSTOMER_PHONE', 'Enter a valid recipient phone number.');

    if (!UUID_RE.test(String(checkoutToken || ''))) throw new ApiError(400, 'INVALID_CHECKOUT_TOKEN', 'Please refresh checkout and try again.');
    if (!shippingAddress || typeof shippingAddress !== 'object' || Array.isArray(shippingAddress)) throw new ApiError(400, 'INVALID_ADDRESS', 'A complete delivery address is required.');
    const requiredAddressFields = ['province','city','delivery_area','locality_landmark','building_house_floor','street_road','delivery_type'];
    if (requiredAddressFields.some(key => !String(shippingAddress[key] || '').trim())) throw new ApiError(400, 'INCOMPLETE_ADDRESS', 'Please complete all required delivery address fields.');
    if (shippingAddress.province !== 'Bagmati Province' || !DELIVERY_CITIES.has(String(shippingAddress.city))) throw new ApiError(400, 'DELIVERY_UNAVAILABLE', 'Delivery is currently available only in the listed Bagmati locations.');
    const cityAreas = DELIVERY_COVERAGE[String(shippingAddress.city)] || {};
    if (!Object.values(cityAreas).some(areas => areas.includes(String(shippingAddress.delivery_area)))) throw new ApiError(400, 'DELIVERY_AREA_UNAVAILABLE', 'That delivery area is not currently available. Please choose an area from the list.');
    if (!['Home','Office'].includes(shippingAddress.delivery_type)) throw new ApiError(400, 'INVALID_DELIVERY_TYPE', 'Choose Home or Office delivery.');
    const selectedPayment = String(paymentMethod || 'cod').toLowerCase();
    if (!VALID_PAYMENT_METHODS.includes(selectedPayment)) throw new ApiError(400, 'INVALID_PAYMENT_METHOD', 'Choose Cash on Delivery or eSewa QR.');
    const customerId = req.auth?.type === 'customer' ? req.auth.sub : null;

    const order = await OrderService.createOrder({
      checkoutToken,
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      shippingAddress,
      items,
      paymentMethod: selectedPayment,
      customerNote
    });

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    next(new ApiError(400, 'ORDER_CREATE_FAILED', err.message));
  }
}


async function trackByCredentials(req, res, next) {
  try {
    const { orderNumber, phone } = req.body || {};
    if (!orderNumber || !phone) throw new ApiError(400, 'VALIDATION_ERROR', 'Order number and phone number are required.');
    const order = await OrderModel.findByOrderNumber(String(orderNumber).trim());
    if (!order) throw new ApiError(404, 'NOT_FOUND', 'No order matches those details.');
    const normalize = (value) => String(value || '').replace(/\D/g, '').replace(/^977/, '');
    if (normalize(order.customer_phone) !== normalize(phone)) {
      throw new ApiError(404, 'NOT_FOUND', 'No order matches those details.');
    }
    // Return only customer-safe tracking data; never expose admin notes or internal IDs.
    res.json({ success: true, data: {
      order_number: order.order_number, order_status: order.order_status,
      payment_method: order.payment_method, payment_status: order.payment_status,
      total: order.total, created_at: order.created_at, updated_at: order.updated_at,
      items: order.items || [], shipping_address: order.shipping_address
    }});
  } catch (err) { next(err); }
}

async function getByOrderNumber(req, res, next) {
  try {
    const order = await OrderModel.findByOrderNumber(req.params.orderNumber);
    if (!order) throw new ApiError(404, 'NOT_FOUND', 'Order not found.');

    // Guests must prove ownership with the phone number as well as the order number.
    const normalizePhone = value => String(value || '').replace(/\D/g, '').replace(/^977/, '');
    if (!req.auth && normalizePhone(order.customer_phone) !== normalizePhone(req.query.phone)) throw new ApiError(404, 'NOT_FOUND', 'Order not found.');
    // Customers may only view their own orders; admins may view any.
    if (req.auth?.type === 'customer' && order.customer_id !== req.auth.sub) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have access to this order.');
    }

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const orders = await OrderModel.listForCustomer(req.auth.sub);
    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
}

async function listForAdmin(req, res, next) {
  try {
    const { status = null, page = '1', limit = '50' } = req.query;
    const limitNum = Math.min(parseInt(limit, 10) || 50, 100);
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);

    const orders = await OrderModel.listForAdmin({ status, limit: limitNum, offset: (pageNum - 1) * limitNum });
    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { status, adminNote } = req.body || {};

    if (!VALID_STATUSES.includes(status)) {
      throw new ApiError(400, 'VALIDATION_ERROR', `status must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    const existing = await OrderModel.findById(req.params.id);
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Order not found.');

    let updated;
    if (status === 'cancelled' && existing.order_status !== 'cancelled') {
      await require('../services/orderService').releaseOrderStock(req.params.id);
      updated = await OrderModel.findById(req.params.id);
    } else {
      updated = await OrderModel.updateStatus(req.params.id, status, adminNote);
    }

    await AuditLogModel.record({
      adminId: req.admin.id,
      adminName: req.admin.name,
      action: 'ORDER_STATUS_CHANGED',
      entityType: 'order',
      entityId: req.params.id,
      oldValue: { order_status: existing.order_status },
      newValue: { order_status: status },
      ipAddress: req.ip
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}


async function updatePaymentStatus(req, res, next) {
  try {
    const { paymentStatus } = req.body || {};
    if (!['unpaid', 'paid', 'failed', 'refunded'].includes(paymentStatus)) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid payment status.');
    const existing = await OrderModel.findById(req.params.id);
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Order not found.');
    const updated = await OrderModel.updatePaymentStatus(req.params.id, paymentStatus);
    await AuditLogModel.record({ adminId: req.admin.id, adminName: req.admin.name, action: 'ORDER_PAYMENT_STATUS_CHANGED', entityType: 'order', entityId: req.params.id, oldValue: { payment_status: existing.payment_status }, newValue: { payment_status: paymentStatus }, ipAddress: req.ip });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}

module.exports = { create, trackByCredentials, getByOrderNumber, listMine, listForAdmin, updateStatus, updatePaymentStatus };
