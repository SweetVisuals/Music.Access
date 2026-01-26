import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Plus,
  Trash2,
  ExternalLink,
  Eye,
  Check,
  X,
  Target,
  Calendar,
  DollarSign,
  Users,
  Music,
  TrendingUp,
  BarChart3,
  Search,
  ArrowRight,
  Type,
  CheckCircle,
  Clock,
  Edit,
  Award,
  Zap,
  ArrowLeft
} from 'lucide-react';
import { Goal } from '../types';
import { getGoals, createGoal, updateGoal, deleteGoal } from '../services/supabaseService';
import CustomDropdown from './CustomDropdown';
import CustomInput from './CustomInput';
import ConfirmationModal from './ConfirmationModal';
import { useToast } from '../contexts/ToastContext';

const GoalsPage: React.FC<{ onNavigate?: (view: string) => void }> = ({ onNavigate }) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const data = await getGoals();
      setGoals(data);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const getGoalIcon = (type: string) => {
    switch (type) {
      case 'revenue': return <DollarSign size={20} />;
      case 'followers': return <Users size={20} />;
      case 'uploads': return <Music size={20} />;
      case 'plays': return <TrendingUp size={20} />;
      case 'sales': return <BarChart3 size={20} />;
      default: return <Target size={20} />;
    }
  };

  const getGoalColor = (type: string) => {
    switch (type) {
      case 'revenue': return 'text-emerald-400 bg-emerald-400/10';
      case 'followers': return 'text-blue-400 bg-blue-400/10';
      case 'uploads': return 'text-purple-400 bg-purple-400/10';
      case 'plays': return 'text-orange-400 bg-orange-400/10';
      case 'sales': return 'text-pink-400 bg-pink-400/10';
      default: return 'text-neutral-400 bg-neutral-400/10';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-400/10';
      case 'active': return 'text-blue-400 bg-blue-400/10';
      case 'paused': return 'text-yellow-400 bg-yellow-400/10';
      case 'failed': return 'text-red-400 bg-red-400/10';
      default: return 'text-neutral-400 bg-neutral-400/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={12} />;
      case 'active': return <Zap size={12} />;
      case 'paused': return <Clock size={12} />;
      case 'failed': return <X size={12} />;
      default: return <Clock size={12} />;
    }
  };

  const calculateProgress = (current: number, target: number) => {
    if (target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  const getDaysRemaining = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredGoals = goals.filter(goal => {
    if (filter === 'all') return true;
    if (filter === 'active') return goal.status === 'active';
    if (filter === 'completed') return goal.status === 'completed';
    if (filter === 'type') return goal.type === filter;
    return goal.status === filter;
  });

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const totalTargetValue = goals.reduce((sum, goal) => sum + Number(goal.target), 0);
  const totalCurrentValue = goals.reduce((sum, goal) => sum + Number(goal.current), 0);

  const handleDeleteGoal = async () => {
    if (!goalToDelete) return;
    try {
      await deleteGoal(goalToDelete);
      setGoals(goals.filter(g => g.id !== goalToDelete));
      showToast('Goal deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting goal:', error);
      showToast('Failed to delete goal', 'error');
    } finally {
      setGoalToDelete(null);
    }
  };

  const handleToggleStatus = async (goal: Goal) => {
    try {
      const newStatus = goal.status === 'active' ? 'paused' : 'active';
      const updated = await updateGoal(goal.id, { status: newStatus });
      setGoals(goals.map(g => g.id === goal.id ? updated : g));
    } catch (error) {
      console.error('Error updating goal status:', error);
      showToast('Failed to update goal status', 'error');
    }
  };

  const handleCreateGoal = async (newGoal: Omit<Goal, 'id' | 'createdAt'>) => {
    try {
      const created = await createGoal(newGoal);
      setGoals([created, ...goals]);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating goal:', error);
      showToast('Failed to create goal', 'error');
    }
  };

  const handleUpdateGoal = async (updatedGoal: Goal) => {
    try {
      const updated = await updateGoal(updatedGoal.id, updatedGoal);
      setGoals(goals.map(g => g.id === updatedGoal.id ? updated : g));
      setSelectedGoal(null);
    } catch (error) {
      console.error('Error updating goal:', error);
      showToast('Failed to update goal', 'error');
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto pb-12 pt-6 px-6 lg:px-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-r-2 border-primary/50 rounded-full animate-spin animation-delay-150"></div>
              <div className="absolute inset-4 border-b-2 border-primary/20 rounded-full animate-spin animation-delay-300"></div>
            </div>
            <p className="text-primary font-mono text-xs tracking-[0.2em] animate-pulse">LOADING_GOALS...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto pb-12 pt-6 px-6 lg:px-8 animate-in fade-in duration-500">
      {/* Back Button */}
      <Link
        to="/dashboard"
        className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-6 group inline-flex"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-xs font-bold uppercase tracking-wider">Back to Dashboard</span>
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white mb-2">Goals</h1>
          <p className="text-neutral-500 text-sm">Set and track your music career goals.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black font-bold rounded-lg hover:bg-neutral-200 transition-colors text-xs"
          >
            <Plus size={14} />
            Create Goal
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-neutral-900/40 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <Target size={18} />
            </div>
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Active Goals</h3>
          </div>
          <p className="text-3xl font-black text-white">{activeGoals.length}</p>
        </div>

        <div className="bg-neutral-900/40 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
              <CheckCircle size={18} />
            </div>
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Completed</h3>
          </div>
          <p className="text-3xl font-black text-white">{completedGoals.length}</p>
        </div>

        <div className="bg-neutral-900/40 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
              <TrendingUp size={18} />
            </div>
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Success Rate</h3>
          </div>
          <p className="text-3xl font-black text-white">
            {goals.length > 0 ? Math.round((completedGoals.length / goals.length) * 100) : 0}%
          </p>
        </div>

        <div className="bg-neutral-900/40 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400">
              <Award size={18} />
            </div>
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">On Track</h3>
          </div>
          <p className="text-3xl font-black text-white">
            {goals.length > 0 ? Math.round((totalCurrentValue / (totalTargetValue || 1)) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Filters (Enhanced) */}
      <div className="flex flex-wrap gap-2 mb-8">
        {['all', 'active', 'completed', 'revenue', 'followers'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 capitalize ${filter === f
              ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
              : 'bg-neutral-900/50 text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
          >
            {f === 'all' ? 'All Goals' : f}
          </button>
        ))}
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredGoals.map((goal) => {
          const progress = calculateProgress(goal.current, goal.target);
          const daysRemaining = getDaysRemaining(goal.deadline);
          const isOverdue = daysRemaining < 0 && goal.status === 'active';

          return (
            <div
              key={goal.id}
              className="group relative bg-gradient-to-br from-neutral-900/80 to-neutral-900/40 rounded-3xl p-8 hover:from-neutral-800 hover:to-neutral-900/60 transition-all duration-300"
            >
              {/* Goal Header */}
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-5">
                  <div className={`p-4 rounded-2xl transition-transform group-hover:scale-110 duration-300 ${getGoalColor(goal.type)}`}>
                    {getGoalIcon(goal.type)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white mb-1 tracking-tight">{goal.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{goal.category}</span>
                      <span className="w-1 h-1 rounded-full bg-neutral-700"></span>
                      <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{goal.type}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusColor(goal.status)}`}>
                    {getStatusIcon(goal.status)}
                    {goal.status}
                  </span>
                  {goal.status === 'active' && (
                    <span className={`text-xs font-bold ${isOverdue ? 'text-red-400' : 'text-neutral-500'}`}>
                      {isOverdue ? 'Overdue' : `${daysRemaining} days left`}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Section - Big & Bold */}
              <div className="mb-8">
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <span className="text-4xl font-black text-white tracking-tight leading-none">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-sm text-neutral-400 font-medium mb-1">Current Progress</span>
                    <span className="text-white font-mono font-bold">
                      {goal.current.toLocaleString()} <span className="text-neutral-600">/</span> {goal.target.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="relative w-full h-4 bg-neutral-950 rounded-full overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${goal.status === 'completed'
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                      : 'bg-gradient-to-r from-white via-neutral-200 to-neutral-400'
                      }`}
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse-slow"></div>
                  </div>
                </div>
              </div>

              {/* Separator */}
              <div className="h-px w-full bg-neutral-800/50 mb-6 group-hover:bg-neutral-700/50 transition-colors"></div>

              {/* Sub-details and Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-neutral-400">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    <span className="font-medium">{new Date(goal.deadline).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
                  <button
                    onClick={() => handleToggleStatus(goal)}
                    className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title={goal.status === 'active' ? "Pause Goal" : "Resume Goal"}
                  >
                    {goal.status === 'active' ? <Clock size={16} /> : <Zap size={16} />}
                  </button>
                  <button
                    onClick={() => setSelectedGoal(goal)}
                    className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title="Edit Goal"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => setGoalToDelete(goal.id)}
                    className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Delete Goal"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredGoals.length === 0 && (
          <div className="col-span-full py-24 text-center rounded-3xl bg-neutral-900/20 border-2 border-dashed border-neutral-800/50 flex flex-col items-center justify-center group hover:border-neutral-700 transition-colors">
            <div className="w-20 h-20 bg-neutral-900 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Target size={32} className="text-neutral-600 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No goals found</h3>
            <p className="text-neutral-500 max-w-sm mx-auto mb-8">
              Start tracking your progress by creating your first goal.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
            >
              Create New Goal
            </button>
          </div>
        )}
      </div>

      {/* Create Goal Modal */}
      {showCreateModal && (
        <CreateGoalModal onClose={() => setShowCreateModal(false)} onGoalCreated={handleCreateGoal} />
      )}

      {/* Edit Goal Modal */}
      {selectedGoal && (
        <EditGoalModal
          goal={selectedGoal}
          onClose={() => setSelectedGoal(null)}
          onGoalUpdated={handleUpdateGoal}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!goalToDelete}
        onClose={() => setGoalToDelete(null)}
        onConfirm={handleDeleteGoal}
        title="Delete Goal"
        message="Are you sure you want to delete this goal? This action cannot be undone."
        confirmLabel="Delete Goal"
        cancelLabel="Cancel"
        isDestructive={true}
      />
    </div>
  );
};

// Create Goal Modal Component
const CreateGoalModal: React.FC<{ onClose: () => void; onGoalCreated: (goal: Omit<Goal, 'id' | 'createdAt'>) => void }> = ({ onClose, onGoalCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    type: 'revenue' as Goal['type'],
    target: '',
    deadline: '',
    description: '',
    category: 'monthly' as Goal['category']
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const newGoal: Omit<Goal, 'id' | 'createdAt'> = {
        title: formData.title,
        type: formData.type,
        target: parseFloat(formData.target),
        current: 0,
        deadline: formData.deadline,
        status: 'active',
        description: formData.description,
        category: formData.category
      };

      await onGoalCreated(newGoal);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full max-w-md bg-[#0a0a0a] border border-neutral-800 rounded-xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Create New Goal</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded text-neutral-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <CustomInput
            label="Goal Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter goal title"
            icon={<Type size={16} />}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <CustomDropdown
              label="Type"
              value={formData.type}
              onChange={(val) => setFormData({ ...formData, type: val as Goal['type'] })}
              options={[
                { value: 'revenue', label: 'Revenue', icon: <DollarSign size={14} /> },
                { value: 'followers', label: 'Followers', icon: <Users size={14} /> },
                { value: 'uploads', label: 'Uploads', icon: <Music size={14} /> },
                { value: 'plays', label: 'Plays', icon: <TrendingUp size={14} /> },
                { value: 'sales', label: 'Sales', icon: <BarChart3 size={14} /> },
                { value: 'custom', label: 'Custom', icon: <Target size={14} /> }
              ]}
            />

            <CustomDropdown
              label="Category"
              value={formData.category}
              onChange={(val) => setFormData({ ...formData, category: val as Goal['category'] })}
              options={[
                { value: 'monthly', label: 'Monthly' },
                { value: 'quarterly', label: 'Quarterly' },
                { value: 'yearly', label: 'Yearly' },
                { value: 'custom', label: 'Custom' }
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <CustomInput
              label="Target Value"
              type="number"
              value={formData.target}
              onChange={(e) => setFormData({ ...formData, target: e.target.value })}
              placeholder="0"
              icon={<Target size={16} />}
              required
            />

            <div>
              <label className="text-xs font-bold text-neutral-400 uppercase mb-2 block">Deadline</label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-400 uppercase mb-2 block">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your goal..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none h-20 resize-none"
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-white/5 text-white font-bold rounded-lg hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Goal Modal Component
const EditGoalModal: React.FC<{ goal: Goal; onClose: () => void; onGoalUpdated: (goal: Goal) => void }> = ({ goal, onClose, onGoalUpdated }) => {
  const [formData, setFormData] = useState({
    title: goal.title,
    current: goal.current.toString(),
    deadline: goal.deadline,
    description: goal.description || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updatedGoal: Goal = {
        ...goal,
        title: formData.title,
        current: parseFloat(formData.current),
        deadline: formData.deadline,
        description: formData.description,
        status: parseFloat(formData.current) >= goal.target ? 'completed' : goal.status
      };

      await onGoalUpdated(updatedGoal);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full max-w-md bg-[#0a0a0a] border border-neutral-800 rounded-xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Edit Goal</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded text-neutral-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-neutral-400 uppercase mb-2 block">Goal Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-400 uppercase mb-2 block">Current Progress</label>
            <input
              type="number"
              value={formData.current}
              onChange={(e) => setFormData({ ...formData, current: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-400 uppercase mb-2 block">Deadline</label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-400 uppercase mb-2 block">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none h-20 resize-none"
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-white/5 text-white font-bold rounded-lg hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoalsPage;
