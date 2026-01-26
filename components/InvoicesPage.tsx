import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Send,
  Eye,
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Edit,
  Trash2,
  Users,
  TrendingUp,
  BarChart3,
  Target
} from 'lucide-react';
import { getPurchases } from '../services/supabaseService';
import { Purchase, Goal } from '../types';
import CustomDropdown from './CustomDropdown';
import CustomInput from './CustomInput';
import { useToast } from '../contexts/ToastContext';

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  clientName: string;
  clientEmail: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    clientName: '',
    description: '',
    amount: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const purchasesData = await getPurchases();
        setPurchases(purchasesData);

        // Convert purchases to invoices for demo purposes
        const mockInvoices: Invoice[] = purchasesData.slice(0, 5).map((purchase, index) => ({
          id: `inv-${index + 1}`,
          invoiceNumber: `INV-${String(index + 1).padStart(4, '0')}`,
          date: purchase.date,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          clientName: purchase.seller,
          clientEmail: `${purchase.seller.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          items: purchase.purchaseItems && purchase.purchaseItems.length > 0
            ? purchase.purchaseItems.map(pi => ({
              description: pi.name,
              quantity: 1,
              rate: pi.price,
              amount: pi.price
            }))
            : [
              {
                description: purchase.item,
                quantity: 1,
                rate: purchase.amount,
                amount: purchase.amount
              }
            ],
          subtotal: purchase.amount,
          tax: 0,
          total: purchase.amount,
          status: purchase.status === 'Completed' ? 'paid' : 'sent',
          notes: `Payment for ${purchase.item}`
        }));

        setInvoices(mockInvoices);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-400 bg-green-400/10';
      case 'sent': return 'text-blue-400 bg-blue-400/10';
      case 'draft': return 'text-neutral-400 bg-neutral-400/10';
      case 'overdue': return 'text-red-400 bg-red-400/10';
      case 'cancelled': return 'text-red-400 bg-red-400/10';
      default: return 'text-neutral-400 bg-neutral-400/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle size={12} />;
      case 'sent': return <Send size={12} />;
      case 'draft': return <Edit size={12} />;
      case 'overdue': return <AlertCircle size={12} />;
      case 'cancelled': return <X size={12} />;
      default: return <Clock size={12} />;
    }
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    // Mock download functionality
    const invoiceData = `
INVOICE ${invoice.invoiceNumber}
Date: ${invoice.date}
Due: ${invoice.dueDate}

Bill To: ${invoice.clientName}
${invoice.clientEmail}

Items:
${invoice.items.map(item => `${item.description} - $${item.amount.toFixed(2)}`).join('\n')}

Subtotal: $${invoice.subtotal.toFixed(2)}
Tax: $${invoice.tax.toFixed(2)}
Total: $${invoice.total.toFixed(2)}

Status: ${invoice.status.toUpperCase()}
    `;

    const blob = new Blob([invoiceData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.invoiceNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto pb-4 lg:pb-32 pt-6 px-6 lg:px-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-r-2 border-primary/50 rounded-full animate-spin animation-delay-150"></div>
              <div className="absolute inset-4 border-b-2 border-primary/20 rounded-full animate-spin animation-delay-300"></div>
            </div>
            <p className="text-primary font-mono text-xs tracking-[0.2em] animate-pulse">LOADING_INVOICES...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto pb-4 lg:pb-32 pt-6 px-6 lg:px-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="hidden">
          <h1 className="text-3xl lg:text-5xl font-black text-white mb-2 tracking-tighter">Invoices</h1>
          <p className="text-neutral-500 text-sm lg:text-base">Manage your invoices and track payments.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black font-bold rounded-lg hover:bg-neutral-200 transition-colors text-xs"
          >
            <Plus size={14} />
            Create Invoice
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-900 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <CustomDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'draft', label: 'Draft' },
              { value: 'sent', label: 'Sent' },
              { value: 'paid', label: 'Paid' },
              { value: 'overdue', label: 'Overdue' },
              { value: 'cancelled', label: 'Cancelled' }
            ]}
            className="w-full md:w-48"
          />
        </div>
      </div>

      {/* Invoices Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredInvoices.map((invoice) => (
          <div key={invoice.id} className="bg-[#0a0a0a] rounded-xl p-6 hover:bg-white/5 transition-colors">
            {/* Invoice Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">{invoice.invoiceNumber}</h3>
                <p className="text-sm text-neutral-400">{invoice.clientName}</p>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase ${getStatusColor(invoice.status)}`}>
                {getStatusIcon(invoice.status)}
                {invoice.status}
              </span>
            </div>

            {/* Invoice Details */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Date:</span>
                <span className="text-white">{invoice.date}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Due:</span>
                <span className="text-white">{invoice.dueDate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Amount:</span>
                <span className="text-white font-mono">${invoice.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedInvoice(invoice)}
                className="flex-1 py-2 px-3 bg-white/5 text-white font-bold rounded-lg text-xs hover:bg-white/10 transition-colors flex items-center justify-center gap-1"
              >
                <Eye size={12} />
                View
              </button>
              <button
                onClick={() => handleDownloadInvoice(invoice)}
                className="flex-1 py-2 px-3 bg-primary text-black font-bold rounded-lg text-xs hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
              >
                <Download size={12} />
                Download
              </button>
            </div>
          </div>
        ))}

        {filteredInvoices.length === 0 && (
          <div className="col-span-full py-16 text-center rounded-xl bg-white/5">
            <FileText size={48} className="mx-auto mb-4 text-neutral-600" />
            <p className="text-neutral-500 font-mono mb-4">No invoices found.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-primary/10 text-primary border border-primary/50 rounded hover:bg-primary hover:text-black transition-colors font-mono text-xs uppercase tracking-wider"
            >
              Create Your First Invoice
            </button>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setSelectedInvoice(null)}>
          <div className="w-full max-w-2xl bg-[#0a0a0a] rounded-xl shadow-2xl flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6">
              <h2 className="text-xl font-bold text-white">Invoice {selectedInvoice.invoiceNumber}</h2>
              <button onClick={() => setSelectedInvoice(null)} className="p-1.5 hover:bg-white/10 rounded text-neutral-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Client Info */}
              <div>
                <h3 className="text-sm font-bold text-neutral-400 uppercase mb-3">Bill To</h3>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-white font-bold">{selectedInvoice.clientName}</p>
                  <p className="text-neutral-400 text-sm">{selectedInvoice.clientEmail}</p>
                </div>
              </div>

              {/* Invoice Items */}
              <div>
                <h3 className="text-sm font-bold text-neutral-400 uppercase mb-3">Items</h3>
                <div className="space-y-2">
                  {selectedInvoice.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-white/5 rounded">
                      <div>
                        <p className="text-white font-medium">{item.description}</p>
                        <p className="text-neutral-400 text-sm">Qty: {item.quantity} × ${item.rate.toFixed(2)}</p>
                      </div>
                      <p className="text-white font-mono">${item.amount.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-white/5 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Subtotal:</span>
                  <span className="text-white">${selectedInvoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Tax:</span>
                  <span className="text-white">${selectedInvoice.tax.toFixed(2)}</span>
                </div>
                <div className="pt-2">
                  <div className="flex justify-between">
                    <span className="text-white font-bold">Total:</span>
                    <span className="text-white font-mono text-lg">${selectedInvoice.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div>
                  <h3 className="text-sm font-bold text-neutral-400 uppercase mb-3">Notes</h3>
                  <p className="text-neutral-300 whitespace-pre-wrap">{selectedInvoice.notes}</p>
                </div>
              )}
            </div>

            <div className="p-6 flex gap-3">
              <button
                onClick={() => handleDownloadInvoice(selectedInvoice)}
                className="flex-1 py-2 px-4 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Download size={16} />
                Download Invoice
              </button>
              <button className="flex-1 py-2 px-4 bg-white/5 text-white font-bold rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                <Send size={16} />
                Send to Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowCreateModal(false)}>
          <div className="w-full max-w-md bg-[#0a0a0a] rounded-xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Create New Invoice</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 hover:bg-white/10 rounded text-neutral-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase mb-2 block">Client Name</label>
                <input
                  type="text"
                  placeholder="Enter client name"
                  className="w-full bg-neutral-900 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase mb-2 block">Service Description</label>
                <textarea
                  placeholder="Describe the service or product"
                  onChange={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
                  }}
                  className="w-full bg-neutral-900 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none min-h-[5rem] h-auto max-h-40 resize-none custom-scrollbar"
                />
              </div>

              <CustomInput
                label="Amount ($)"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                icon={<DollarSign size={16} />}
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2 px-4 bg-white/5 text-white font-bold rounded-lg hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Mock create invoice
                  setShowCreateModal(false);
                  showToast('Invoice created successfully!', 'success');
                }}
                className="flex-1 py-2 px-4 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors"
              >
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesPage;
